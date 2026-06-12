# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A verified-student ticket marketplace for Columbia & Barnard. It is a **per-event continuous double auction (order book)**, not a classifieds board: buyers post bids, sellers post asks, and the engine auto-matches when a bid price ≥ an ask price. The platform never touches money, escrow, or ticket transfer — the actual trade happens off-platform. See `README.md` for the full product description; this file covers the non-obvious mechanics.

## Commands

```bash
npm run dev          # dev server → http://localhost:3000
npm run build        # prisma generate + prisma migrate deploy + next build
npm run lint         # next lint

npm run db:push      # sync schema → DB (no migration file)
npm run db:seed      # seed demo data (idempotent: resets the market, keeps users)
npm run db:reset     # force-reset schema + reseed
npm run db:studio    # Prisma Studio
```

Engine/lifecycle smoke tests (dev-only, not part of the build) — require a local Postgres in env:
```bash
POSTGRES_PRISMA_URL=… POSTGRES_URL_NON_POOLING=… npx tsx scripts/test-matching.ts
npx tsx scripts/test-lifecycle.ts
```
There is no test runner — these are standalone `tsx` scripts that print `✓`/`✗`. The `scripts/*.mjs` files are Playwright walkthroughs/screenshotters that drive a running dev server via Dev Login.

## Local auth shortcuts

- **Dev Login** (`ALLOW_DEV_LOGIN="true"` in `.env`) signs in as any `@columbia.edu`/`@barnard.edu` email with no Google/password. Unconditionally disabled when `NODE_ENV === "production"`.
- The **phone gate** blocks onboarding without Firebase configured. To skip it locally, set `phoneVerifiedAt` on your user directly (`npm run db:studio`) to land on the profile step.

## Architecture

Next.js 15 App Router (React 19, Server Actions) · Auth.js v5 (Google + JWT + Prisma adapter) · Prisma + Postgres · Firebase Phone Auth. Import alias `@/*` → `src/*`.

**The matching engine (`src/lib/matching.ts`) is the heart of the app.** Three invariants are enforced there and must be preserved:
- **Price-time priority (FIFO)** — best price first (lowest ask / highest bid), ties broken by earliest `postedAt`. This ordering *is* the queue.
- **Resting-order price** — a trade settles at the limit price of the order already on the book (the maker), not the incoming taker.
- **Partial fills** — an incoming order fills across multiple counterparties; any remainder stays live.

**Concurrency:** every code path that creates a reservation or frees reserved tickets must run inside `runMatch(eventId, fn)`, which holds a per-event Postgres **advisory lock** (`pg_advisory_xact_lock`, transaction-scoped → pgbouncer-safe, auto-released). Matching is partitioned by event, so this serializes only same-event matching. Never create a `Match` or restore `remainingQuantity` outside this lock.

**Status/lifecycle (`src/lib/constants.ts`):** statuses are plain strings validated in constants, not Postgres enums (cheap migrations).
- Order: `OPEN | FILLED | CANCELLED`. `EXPIRED` is **computed at read time** (`expiresAt < now`), never stored — don't add it as a status.
- Match: `RESERVED → ACCEPTED → COMPLETED` (happy path); `DECLINED/EXPIRED` free tickets back to the book; `CANCELLED` is a back-out from an accepted deal.
- Reservations expire after `RESERVATION_WINDOW_MS` (24h) and roll to the next counterparty. Expiry is enforced **lazily on activity**, with the daily Vercel cron (`/api/cron/reservations`, 8:00 UTC, Bearer `CRON_SECRET`) as a backstop — not a real-time scheduler.

**Anonymity / privacy is a core invariant, not a feature toggle.** Pre-match, the book exposes only ticket + price — no identity, no trust signal. Identity + contact are revealed only after **both** sides confirm the reservation. Always query other users through `PUBLIC_USER_SELECT` (`src/lib/public-profile.ts`); never select `email`/`phone` into anything pre-match. Public identity = first name + last initial, school, class year, join date.

**Money** is stored and handled as integer **cents** everywhere; format for display via `src/lib/format.ts`.

**Domain gate** (`src/lib/domains.ts`) is **exact-match** (rejects `evil-columbia.edu`), enforced in the Auth.js `signIn` callback (`src/auth.config.ts` + `src/auth.ts`). `auth.config.ts` is the edge-safe subset; `auth.ts` adds the Prisma adapter + dev-login.

### Layout

- `src/lib/actions/` — all server actions (onboarding, phone, events, listings, matches, reports). Mutations live here, not in route handlers.
- `src/lib/` — `matching.ts`, `listing.ts`/`queries.ts` (book + stats reads), `reputation.ts`, `notifications.ts`, `session.ts` (`getCurrentUser`/`requireUser`/`isOnboarded`/`isPhoneVerified`), `firebase/` (web SDK + Admin token verification).
- `src/app/(app)/` — authenticated area behind Nav + onboarding guard: `onboarding/`, `events/`, `matches/` (confirm → chat & confirm reveal+chat → complete → rate), `profile/[id]/`, `notifications/`.
- `prisma/` — `schema.prisma`, `migrations/`, `seed.ts`.

## Deployment

Single `main` branch. A push to `main` auto-deploys to production on Vercel, which runs `prisma migrate deploy` as part of `build`. Schema changes therefore need a committed migration (use a migration, not `db:push`, for anything that ships).
