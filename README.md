# Campus Ticket Board

A **verified student marketplace for event-ticket interest** at Columbia &
Barnard. It centralizes the scattered "anyone selling for X?" posts into a clean,
per-event mini-market — without touching money or guaranteeing transfers.

> **We don't handle payment, escrow, or transfer.** The board's only job is to
> let verified students find each other and see the real market. The actual
> trade happens off-platform (Posh, Partiful, Venmo) between the two parties.

---

## What it does (MVP scope)

1. **Columbia/Barnard sign-in** — Google OAuth, restricted to `@columbia.edu`
   and `@barnard.edu` verified emails.
2. **Listings** — post Buying or Selling, with quantity, price/ticket, an
   expiry, and optional notes, tied to a specific event.
3. **Event pages** — each event is a two-sided mini-market: **Selling** (asks,
   cheapest first) and **Buying** (bids, highest first), with the **last
   confirmed sale** shown separately so asking prices can't distort the market.
4. **Match** — tap "I'm interested." On **mutual interest** (the owner accepts),
   both parties see each other's **verified email** and coordinate the transfer
   themselves.
5. **Trust** — verified badges, school/year, reputation (★ rating + completed
   trades), account age, "successful trade" confirmations, a report button, and
   a rate-limit on new accounts.

### Deliberately **not** built (where the headaches live)
Escrow · payments · automated transfer · auctions · dynamic pricing · a full
bidding engine.

---

## Tech stack

- **Next.js 15** (App Router, React 19, Server Actions) + **TypeScript**
- **Tailwind CSS** — design system in `tailwind.config.ts`
- **Auth.js (NextAuth v5)** — Google provider, JWT sessions
- **Prisma** + **SQLite** (swap to Postgres by changing one line)

---

## Getting started

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env
#   - AUTH_SECRET is required (generate: openssl rand -base64 32)
#   - For real Google login, fill AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
#     (see "Google OAuth" below). For local testing you can skip this and
#     use the built-in Dev Login instead.

# 3. Create the database + seed demo data
npm run db:push
npm run db:seed

# 4. Run
npm run dev      # http://localhost:3000
```

### Dev Login (no Google needed)

For local testing, set `ALLOW_DEV_LOGIN="true"` in `.env` (default). The sign-in
screen then shows a **"Dev login"** option that signs you in with any
`@columbia.edu` / `@barnard.edu` email — no password, no Google. It is
**impossible to enable in production** (`NODE_ENV === "production"` disables it
unconditionally) and only ever mints accounts on the allowed domains.

Seeded accounts you can use: `jordan@columbia.edu`, `riya@columbia.edu`,
`ava@barnard.edu`, `dev@columbia.edu`, `theo@columbia.edu`, `mara@barnard.edu`.

### Google OAuth (real sign-in)

1. Google Cloud Console → **APIs & Services → Credentials → Create OAuth client
   ID → Web application**.
2. Authorized redirect URI (dev):
   `http://localhost:3000/api/auth/callback/google`
3. Put the client id/secret in `.env` as `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

Only verified emails on the allowed domains are accepted, enforced in the
`signIn` callback (`src/auth.config.ts` + `src/auth.ts`).

---

## Project layout

```
prisma/
  schema.prisma        # User/Account/Session + Event/Listing/Match/Rating/Report
  seed.ts              # demo users, events, a live market, one completed trade
src/
  auth.config.ts       # edge-safe Auth.js config (Google + domain gate)
  auth.ts              # full config: Prisma adapter, dev-login, jwt/session
  middleware.ts        # route protection + x-pathname header
  lib/
    constants.ts       # app-level enums + limits (SQLite has no enums)
    domains.ts         # allowed-domain enforcement (exact-match)
    prisma.ts          # singleton client
    session.ts         # getCurrentUser / requireUser / isOnboarded
    queries.ts         # event stats, mini-market, last confirmed sale
    reputation.ts      # rating avg + completed-trade aggregation
    format.ts          # money (cents), dates, public names
    actions/           # server actions: onboarding, events, listings, matches, reports
  app/
    page.tsx           # landing + sign-in
    (app)/             # authenticated area (Nav + onboarding guard)
      events/          # browse, event mini-market, create event
      listings/new/    # post a listing
      matches/         # accept/decline, email reveal, confirm, rate
      profile/[id]/    # reputation + confirmed trades + report
      onboarding/      # collect school + class year
  components/          # Nav, ListingCard, InterestButton, MatchActions, …
```

## Scripts

| Command | What |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build (runs `prisma generate`) |
| `npm run db:push` | Sync schema → SQLite |
| `npm run db:seed` | Seed demo data (idempotent: resets the market, keeps users) |
| `npm run db:studio` | Prisma Studio |

## Safety & fraud controls

- Verified campus email only; exact-domain match (rejects `evil-columbia.edu`).
- Public identity: first name + last initial, school, class year, join date.
- Reputation: ★ ratings + completed-trade count, shown on every listing.
- **Asking price vs. last confirmed sale** shown separately.
- Report button on every profile; new-account active-listing cap.
- Persistent banner: payment/transfer happen off-platform, at your own risk.
