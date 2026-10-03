/**
 * The offline-first mutation queue — the core of CrewOps.
 *
 * Field crews work in basements, on ships, on remote sites: the network is
 * gone for hours and comes back for thirty seconds. Every write the app
 * makes is a *mutation* that goes through this queue:
 *
 * 1. `enqueue` persists the mutation to storage **before** anything else
 *    happens — a crash can never lose a check-in.
 * 2. `flush` drains FIFO when connectivity returns. A failing mutation is
 *    retried with per-item attempts; an item that exhausts its attempts is
 *    parked as `dead` (never silently dropped, never blocks the rest).
 * 3. A single in-flight flush is shared — calling `flush()` ten times while
 *    one is running attaches to the same drain.
 */

export interface Mutation {
  id: string;
  type: "checkin" | "incident";
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
}

export interface QueuedMutation extends Mutation {
  status: "pending" | "inflight" | "dead";
}

export type Sender = (mutation: Mutation) => Promise<void>;

/** Storage the queue persists through — inject AsyncStorage in the app,
 *  an in-memory double in tests. */
export interface QueueStorage {
  load(): Promise<QueuedMutation[]>;
  save(queue: QueuedMutation[]): Promise<void>;
}

export interface MutationQueueOptions {
  storage: QueueStorage;
  sender: Sender;
  maxAttempts?: number;
}

export class MutationQueue {
  private queue: QueuedMutation[] = [];
  private readonly storage: QueueStorage;
  private readonly sender: Sender;
  private readonly maxAttempts: number;
  private flushing: Promise<void> | null = null;
  private readonly listeners = new Set<() => void>();
  private loaded = false;

  constructor(options: MutationQueueOptions) {
    this.storage = options.storage;
    this.sender = options.sender;
    this.maxAttempts = options.maxAttempts ?? 3;
  }

  /** Restores the persisted queue — call once at app start. */
  async restore(): Promise<void> {
    if (this.loaded) return;
    this.queue = await this.storage.load();
    this.loaded = true;
    this.notify();
  }

  /** Persists before returning — a crash after enqueue loses nothing. */
  async enqueue(
    type: Mutation["type"],
    payload: Record<string, unknown>,
  ): Promise<Mutation> {
    const mutation: QueuedMutation = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      type,
      payload,
      createdAt: Date.now(),
      attempts: 0,
      status: "pending",
    };
    this.queue.push(mutation);
    await this.storage.save(this.queue);
    this.notify();
    return mutation;
  }

  /** Drains the queue FIFO. Concurrent calls share one drain. */
  flush(): Promise<void> {
    if (this.flushing) return this.flushing;
    this.flushing = this.drain().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  private async drain(): Promise<void> {
    for (const mutation of [...this.queue]) {
      if (mutation.status === "dead") continue;
      mutation.status = "inflight";
      mutation.attempts += 1;
      this.notify();
      try {
        await this.sender(mutation);
        this.queue = this.queue.filter((item) => item.id !== mutation.id);
        await this.storage.save(this.queue);
        this.notify();
      } catch {
        if (mutation.attempts >= this.maxAttempts) {
          mutation.status = "dead"; // parked, visible, never silently dropped
        } else {
          mutation.status = "pending"; // retried on the next flush
        }
        await this.storage.save(this.queue);
        this.notify();
      }
    }
  }

  /** Fires on every queue change — screens subscribe to render badges. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): { pending: number; inflight: number; dead: number } {
    const count = (status: QueuedMutation["status"]) =>
      this.queue.filter((item) => item.status === status).length;
    return { pending: count("pending"), inflight: count("inflight"), dead: count("dead") };
  }

  deadLetter(): QueuedMutation[] {
    return this.queue.filter((item) => item.status === "dead");
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

/** The app wires this to AsyncStorage; tests use the in-memory double. */
export function createAsyncStorageAdapter(storage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}): QueueStorage {
  const KEY = "crewops.mutation-queue";
  return {
    load: async () => {
      const raw = await storage.getItem(KEY);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as QueuedMutation[]) : [];
      } catch {
        return []; // corrupted storage degrades to an empty queue, never a crash
      }
    },
    save: async (queue) => {
      await storage.setItem(KEY, JSON.stringify(queue));
    },
  };
}
