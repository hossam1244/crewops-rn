# CrewOps

**Offline-first field operations app** — React Native · Expo · TypeScript · Redux Toolkit

Attendance check-ins and incident reporting for crews that work where the
network doesn't: basements, ships, remote sites. Every write flows through a
**persisted mutation queue** that survives crashes, retries with per-item
attempt limits, and drains FIFO the moment connectivity returns.

> Fictional product, real practices. Portfolio project by
> [Hossam Rakha](https://github.com/hossam1244) — the React Native counterpart
> to the [NovaBank](https://github.com/hossam1244/novabank-api) client family.

[![CI](https://github.com/hossam1244/crewops-rn/actions/workflows/ci.yml/badge.svg)](https://github.com/hossam1244/crewops-rn/actions/workflows/ci.yml)
[![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB)](https://reactnative.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## The core: `MutationQueue`

`src/offline/MutationQueue.ts` is the whole point of this repo — ~150 lines
that make the app offline-first:

| Guarantee | How |
|---|---|
| **Nothing is lost** | `enqueue` persists to storage *before* returning — a crash can never lose a check-in |
| **FIFO drain** | `flush` sends in order; a restored queue from yesterday drains before today's |
| **Retry with a limit** | Failures requeue for the next flush; after `maxAttempts` the item is parked as `dead` — visible in `deadLetter()`, never silently dropped, never blocking the rest |
| **One drain** | Concurrent `flush()` calls share a single in-flight drain — nothing double-sends |
| **Injectable edges** | Storage and sender are interfaces: AsyncStorage + `fetch` in the app, in-memory doubles in tests |
| **Observable** | `onChange` + `snapshot()` drive the live "3 pending · 1 sending · 0 failed" badge |

The UI is deliberately **local-first**: screens render local state instantly
and mark rows `synced` as the queue drains — the crew never waits on a
spinner.

## Run it

```bash
npm install
npx expo start        # then press i (iOS) / a (Android), or scan with Expo Go
```

Point `sender` in `App.tsx` at your backend — anything that accepts the
mutation JSON works.

## Test it

```bash
npm run typecheck
npm test
```

The suite covers the queue contract deterministically: persist-before-return,
FIFO order, retry-after-outage, dead-letter after max attempts, single shared
drain under concurrent flushes, startup restore, and subscriber notification —
plus the Redux slice and the rendered flows (check-in shows pending, incident
form validates and reports offline).

## Structure

```
src/
├── offline/MutationQueue.ts   the core — persisted FIFO queue with retries
├── store/                     Redux Toolkit slice (local-first check-ins)
└── screens/                   HomeScreen (dashboard + queue badge) · IncidentsScreen
```

## License

[MIT](LICENSE)
