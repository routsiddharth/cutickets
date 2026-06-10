# CUTickets

A **verified student marketplace for event tickets** at Columbia & Barnard. It
turns the scattered "anyone selling for X?" group-chat posts into a clean,
per-event **order book** that matches buyers and sellers automatically — without
touching money or guaranteeing transfers.

> **We don't handle payment, escrow, or transfer.** The platform's only job is to
> let verified students find a fair price and find each other. The actual trade
> happens off-platform (Posh, Partiful, Venmo) between the two parties.

---

## How it works

1. **Campus sign-in** — Google OAuth restricted to verified `@columbia.edu` /
   `@barnard.edu` emails.
2. **Onboarding (two-step gate)** — verify a phone number (Firebase SMS OTP),
   then set name, school, and class year. Both are required before trading.
3. **Per-event order book** — each event is a continuous double auction. Post a
   **buy** order (your max price) or a **sell** order (your min price), with
   quantity and optional private notes. The book shows resting bids and asks plus
   the **last confirmed sale**, so asking prices can't distort the anchor.
4. **Automatic matching** — when a bid price ≥ an ask price, the orders cross and
   tickets are **reserved** for both parties. The engine enforces:
   - **price-time priority (FIFO)** — best price first, ties broken by who posted
     earliest;
   - **resting-order price** — the trade settles at the price of the order
     already on the book, not the incoming one;
   - **partial fills** — an order fills across multiple counterparties; any
     remainder stays live.
5. **Confirm → reveal → chat** — a match starts **anonymous**. Both sides confirm
   the reservation (within a 24h window), which reveals identities + contact and
   opens a **private on-site chat** to arrange the handoff.
6. **Close & rate** — both parties mark the trade complete; the sale is recorded
   to both trade histories and each can leave a ★ rating.

Matching is partitioned per event and serialized with a per-event Postgres
advisory lock, so concurrent orders can't double-reserve the same tickets.
Reservations that aren't accepted in time expire and roll to the next
counterparty in the queue (enforced on activity, with a daily cron backstop).

### Deliberately **not** built
Escrow · in-app payments · automated ticket transfer · auctions · a full
limit-order-modify engine.

---

## Tech stack

- **Next.js 15** (App Router, React 19, Server Actions) + **TypeScript**
- **Tailwind CSS** — design system in `tailwind.config.ts`
- **Auth.js (NextAuth v5)** — Google provider, JWT sessions, Prisma adapter
- **Prisma** + **Postgres** (local or Vercel Postgres/Neon)
- **Firebase Phone Auth** — SMS OTP for phone verification
- **Vercel** — hosting + Cron (reservation sweep)

---

## Getting started

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
#   - POSTGRES_PRISMA_URL / POSTGRES_URL_NON_POOLING — your Postgres (same value
#     is fine locally)
#   - AUTH_SECRET — required (generate: openssl rand -base64 32)
#   - AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET — for real Google login (optional
#     locally; use Dev Login instead — see below)
#   - CRON_SECRET — guards the reservation cron endpoint
#   - Firebase keys — only needed to exercise real phone verification (see below)

# 3. Create the database + seed demo data
npm run db:push
npm run db:seed

# 4. Run
npm run dev      # http://localhost:3000
```

### Dev Login (no Google needed)

For local testing, keep `ALLOW_DEV_LOGIN="true"` in `.env`. The sign-in screen
then shows a **"Dev login"** option that signs you in with any `@columbia.edu` /
`@barnard.edu` email — no password, no Google. It is **impossible to enable in
production** (`NODE_ENV === "production"` disables it unconditionally) and only
ever mints accounts on the allowed domains.

Seeded accounts: `jordan@columbia.edu`, `riya@columbia.edu`, `ava@barnard.edu`,
`dev@columbia.edu`, `theo@columbia.edu`, `mara@barnard.edu`.

> **Phone gate locally:** onboarding requires a verified phone, which needs
> Firebase configured. To skip it during development, set `phoneVerifiedAt` on
> your user directly (e.g. via `npm run db:studio`) so you land on the profile
> step.

### Google OAuth (real sign-in)

1. Google Cloud Console → **APIs & Services → Credentials → Create OAuth client
   ID → Web application**.
2. Authorized redirect URI (dev):
   `http://localhost:3000/api/auth/callback/google`
3. Put the client id/secret in `.env` as `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

Only verified emails on the allowed domains are accepted, enforced in the
`signIn` callback (`src/auth.config.ts` + `src/auth.ts`).

### Firebase Phone Auth (real phone verification)

The client completes the SMS OTP exchange with Firebase; the server verifies the
resulting ID token with the Admin SDK before persisting the number. Set the
`FIREBASE_*` (Admin SDK) and `NEXT_PUBLIC_FIREBASE_*` (web SDK) vars — see
`src/lib/firebase/`.

---

## Project layout

```
prisma/
  schema.prisma        # User/Account/Session + Event/Listing/Match/Message/
                       #   Notification/Rating/Report/ReservationExclusion
  migrations/          # SQL migrations (Postgres)
  seed.ts              # demo users, events, a live order book, one settled trade
src/
  auth.config.ts       # edge-safe Auth.js config (Google + domain gate)
  auth.ts              # full config: Prisma adapter, dev-login, jwt/session
  middleware.ts        # route protection + x-pathname header
  lib/
    constants.ts       # order/match enums, limits, reservation windows
    domains.ts         # allowed-domain enforcement (exact-match)
    matching.ts        # the order-matching engine (per-event advisory lock)
    listing.ts         # order/book query helpers
    queries.ts         # event stats, best bid/ask, last confirmed sale
    reputation.ts      # rating avg + completed-trade aggregation
    notifications.ts   # in-app notifications
    public-profile.ts  # PUBLIC_USER_SELECT (no email/phone leaks pre-match)
    format.ts          # money (cents), dates, public names
    session.ts         # getCurrentUser / requireUser / isOnboarded / isPhoneVerified
    firebase/          # client SDK + Admin token verification (phone OTP)
    actions/           # server actions: onboarding, phone, events, listings, matches, reports
  app/
    page.tsx           # landing + sign-in
    api/cron/reservations/  # daily reservation-expiry sweep (Bearer CRON_SECRET)
    (app)/             # authenticated area (Nav + onboarding guard)
      onboarding/      # phone verification, then profile (school + class year)
      events/          # browse, event order book, create event, place orders
      matches/         # confirm match, deal desk (reveal + chat), complete, rate
      profile/[id]/    # reputation + confirmed trades + report
      notifications/   # in-app notifications feed
  components/          # Nav, OrderForm, MatchActions, MatchCelebration, DealChat, …
```

## Scripts

| Command | What |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` + `prisma migrate deploy` + `next build` |
| `npm run db:push` | Sync schema → database |
| `npm run db:seed` | Seed demo data (idempotent: resets the market, keeps users) |
| `npm run db:reset` | Force-reset the schema and reseed |
| `npm run db:studio` | Prisma Studio |

## Safety & fraud controls

- Verified campus email **and** phone required before trading; exact-domain match
  (rejects `evil-columbia.edu`).
- **Anonymous until match** — the book shows only ticket + price; identity and
  contact are revealed only after both sides confirm.
- Public identity is first name + last initial, school, class year, join date.
- Reputation: ★ ratings + completed-trade count, shown on profiles.
- **Asking price vs. last confirmed sale** kept separate so asks can't move the
  anchor.
- Report button on every profile; per-account active-order caps (tighter for new
  accounts).
- Persistent banner: payment/transfer happen off-platform, at your own risk.

---

> Deployment: a push to `main` auto-deploys to production on Vercel, which runs
> `prisma migrate deploy` as part of the build.
