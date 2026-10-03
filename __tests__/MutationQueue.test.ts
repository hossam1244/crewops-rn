import { MutationQueue, type QueuedMutation, type QueueStorage } from "../src/offline/MutationQueue";

class MemoryStorage implements QueueStorage {
  state: QueuedMutation[] = [];
  saves = 0;

  async load(): Promise<QueuedMutation[]> {
    return [...this.state];
  }

  async save(queue: QueuedMutation[]): Promise<void> {
    this.saves += 1;
    this.state = [...queue];
  }
}

function queueWith(sender: (mutation: any) => Promise<void>, maxAttempts = 3) {
  const storage = new MemoryStorage();
  const queue = new MutationQueue({ storage, sender, maxAttempts });
  return { queue, storage };
}

describe("MutationQueue", () => {
  it("persists mutations before anything else happens", async () => {
    const { queue, storage } = queueWith(jest.fn());
    await queue.enqueue("checkin", { note: "On site" });

    expect(storage.state).toHaveLength(1);
    expect(storage.state[0].type).toBe("checkin");
    expect(storage.state[0].status).toBe("pending");
  });

  it("drains FIFO on flush", async () => {
    const sent: string[] = [];
    const { queue } = queueWith(async (mutation) => {
      sent.push(mutation.payload.note as string);
    });

    await queue.enqueue("checkin", { note: "first" });
    await queue.enqueue("checkin", { note: "second" });
    await queue.enqueue("checkin", { note: "third" });
    await queue.flush();

    expect(sent).toEqual(["first", "second", "third"]);
    expect(queue.snapshot().pending).toBe(0);
  });

  it("keeps failed mutations for the next flush", async () => {
    let failuresLeft = 1;
    const sent: string[] = [];
    const { queue } = queueWith(async (mutation) => {
      if (failuresLeft > 0) {
        failuresLeft -= 1;
        throw new Error("network gone");
      }
      sent.push(mutation.payload.note as string);
    });

    await queue.enqueue("checkin", { note: "retry-me" });
    await queue.flush();
    expect(queue.snapshot().pending).toBe(1); // requeued, not dropped

    await queue.flush();
    expect(sent).toEqual(["retry-me"]); // survived the outage
    expect(queue.snapshot().pending).toBe(0);
  });

  it("parks mutations as dead after max attempts — never silently drops", async () => {
    const { queue } = queueWith(async () => {
      throw new Error("server rejects this one");
    }, 2);

    await queue.enqueue("incident", { title: "Bad" });
    await queue.flush();
    await queue.flush();

    const dead = queue.deadLetter();
    expect(dead).toHaveLength(1);
    expect(dead[0].attempts).toBe(2);
    expect(dead[0].status).toBe("dead");
    expect(dead[0].payload.title).toBe("Bad"); // still inspectable
  });

  it("concurrent flush calls share one drain", async () => {
    let sends = 0;
    const { queue } = queueWith(async () => {
      sends += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    await queue.enqueue("checkin", { note: "a" });
    await queue.enqueue("checkin", { note: "b" });

    await Promise.all([queue.flush(), queue.flush(), queue.flush()]);

    expect(sends).toBe(2); // each mutation sent once, not three times
  });

  it("restores the persisted queue at startup", async () => {
    const storage = new MemoryStorage();
    const sender = jest.fn();
    await storage.save([
      {
        id: "survivor",
        type: "checkin",
        payload: { note: "from yesterday" },
        createdAt: 1,
        attempts: 0,
        status: "pending",
      },
    ]);

    const queue = new MutationQueue({ storage, sender });
    await queue.restore();

    expect(queue.snapshot().pending).toBe(1);
    await queue.flush();
    expect(sender).toHaveBeenCalledWith(
      expect.objectContaining({ id: "survivor" }),
    );
  });

  it("notifies subscribers on changes", async () => {
    const { queue } = queueWith(jest.fn());
    const events: number[] = [];
    queue.onChange(() => events.push(queue.snapshot().pending));

    await queue.enqueue("checkin", { note: "x" });

    expect(events.length).toBeGreaterThan(0);
  });
});
