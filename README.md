<p align="center">
  <img src="public/logo.png" alt="Morningside Tickets logo" width="120" height="120" />
</p>

<h1 align="center">Morningside Tickets</h1>

A verified Columbia and Barnard marketplace for buying and selling event tickets.

Sellers publish fixed-price listings. A buyer chooses a quantity, reserves those
tickets, and immediately enters a private chat with the seller. Payment and ticket
transfer happen directly between the two students; the platform does not process
money, hold tickets, provide escrow, or guarantee a transfer.

## Marketplace flow

1. Sign in with a verified `@columbia.edu` or `@barnard.edu` Google account.
2. Verify a unique phone number and finish the student profile.
3. A seller selects an event, quantity, fixed price per ticket, and optional private note.
4. Buyers browse individual listings with seller reputation and available inventory.
5. Reserving atomically removes the selected quantity and opens the deal chat.
6. The buyer and seller arrange payment and transfer. The reservation lasts 24 hours.
7. Both confirm completion, then may rate each other.
8. A cancelled or expired reservation returns its quantity to the listing.

## Tech stack

- Next.js 15, React 19, TypeScript, and Server Actions
- Tailwind CSS
- Auth.js with Google OAuth and a development-only credentials provider
- Prisma and PostgreSQL
- Firebase Phone Auth
- Vercel hosting and reservation-expiry cron

## Local setup

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

The app runs at `http://localhost:3000`.

Set `ALLOW_DEV_LOGIN="true"` outside production to sign in without Google. Dev
login still requires a Columbia or Barnard email. Firebase configuration is
required for SMS verification; an existing test user can be marked verified by
setting `phoneVerifiedAt` through Prisma Studio.

## Main code

```text
prisma/schema.prisma             Users, events, listings, deals, chat, ratings
src/lib/actions/listings.ts      Publish, reserve, and cancel listings
src/lib/actions/deals.ts         Chat, cancel, complete, and rate deals
src/lib/deals.ts                 Safe reservation release
src/lib/queries.ts               Event inventory, listings, and sale history
src/app/(app)/events/            Browse events and seller listings
src/app/(app)/deals/             Private deal chat and completion
src/app/api/cron/reservations/   Expiry and reminder backstop
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Generate Prisma, deploy migrations, and build Next.js |
| `npm run db:push` | Synchronize a development database |
| `npm run db:seed` | Reset demo market data and seed listings |
| `npm run db:studio` | Open Prisma Studio |

## Safety boundaries

- Campus email and verified phone are required.
- Seller email, phone, and private note are revealed only inside a deal.
- Reservation quantities are claimed with an atomic database update.
- Listings have per-account caps and ticket/price limits.
- Profiles expose reputation and completed trade history.
- Admin access is restricted to the two emails in `src/lib/admin.ts`.
- Admins can review every registered user, listing, and trade, and can remove listings or cancel active deals.
- Payment and transfer remain off-platform and at the users' risk.
