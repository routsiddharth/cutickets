# Morningside Tickets

This is a fixed-price ticket marketplace for verified Columbia and Barnard
students. Sellers create listings; buyers reserve a quantity and enter a private
deal chat. The app never handles payment or ticket transfer.

## Commands

```bash
npm run dev
npm run build
npm run db:push
npm run db:seed
npm run db:studio
npx tsc --noEmit
```

## Core lifecycle

- Listing: `OPEN | SOLD_OUT | CANCELLED`. Expiry is computed from `expiresAt`.
- Deal: `RESERVED | COMPLETED | CANCELLED | EXPIRED`.
- `reserveListing` atomically decrements available inventory before creating a deal.
- A deal opens chat and reveals contact details immediately.
- Cancelling or expiring a deal restores quantity unless the listing was cancelled or expired.
- Both parties independently confirm completion before reputation and last-sale data update.
- Reservation expiry is handled by the protected cron route.

Money is stored as integer cents. Acting user IDs always come from the server
session. Public listing queries use `PUBLIC_USER_SELECT`; email, phone, and notes
must only be selected on deal pages restricted to the buyer and seller.

Mutations live in `src/lib/actions/`. Schema changes that ship require a committed
PostgreSQL migration because Vercel runs `prisma migrate deploy` during builds.

Local dev login is controlled by `ALLOW_DEV_LOGIN=true` and is always disabled in
production. Phone onboarding requires Firebase unless test data is marked verified
directly in the database.
