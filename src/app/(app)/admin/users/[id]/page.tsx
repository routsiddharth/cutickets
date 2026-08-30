import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import Avatar from "@/components/Avatar";

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireUser();
  if (!isAdmin(admin)) notFound();
  const { id } = await params;
  const [user, listings, deals] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.listing.findMany({ where: { sellerId: id }, orderBy: { createdAt: "desc" }, include: { event: { select: { id: true, name: true } } } }),
    prisma.deal.findMany({
      where: { OR: [{ buyerId: id }, { sellerId: id }] }, orderBy: { createdAt: "desc" },
      include: {
        event: { select: { id: true, name: true } },
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true, ratings: true } },
      },
    }),
  ]);
  if (!user) notFound();

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-7 py-8">
      <Link href="/admin/users" className="text-sm text-muted hover:text-ink">← Users</Link>
      <header className="mt-4 pb-6 border-b border-line">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} email={user.email} image={user.image} size={64} />
          <div className="min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="font-serif text-3xl">{user.name ?? "No name"}</h1>
              {isAdmin(user) && <span className="text-xs text-columbia-deep">Admin</span>}
              {user.bannedAt && <span className="text-xs text-red-700">Suspended</span>}
            </div>
            <p className="text-sm mt-1 break-all">{user.email}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 mt-6 text-sm">
          <AccountFact label="School" value={user.school ?? "Not provided"} />
          <AccountFact label="Class year" value={user.classYear ? String(user.classYear) : "Not provided"} />
          <AccountFact label="Joined" value={formatDate(user.createdAt)} />
          <AccountFact label="Verification" value={user.phoneVerifiedAt ? "Phone verified" : user.emailVerified ? "Email verified" : "Unverified"} />
        </dl>
        <Link href={`/profile/${user.id}`} className="inline-block text-sm text-columbia-deep hover:underline mt-5">View public profile →</Link>
      </header>

      <section className="py-7 border-b border-line">
        <div className="flex items-baseline justify-between mb-3"><h2 className="font-medium">Trade history</h2><span className="text-sm text-muted">{deals.length}</span></div>
        {deals.length === 0 ? <p className="text-sm text-muted">No trades.</p> : (
          <div className="divide-y divide-line border-y border-line">
            {deals.map((deal) => {
              const buying = deal.buyerId === user.id;
              const other = buying ? deal.seller : deal.buyer;
              return (
                <div key={deal.id} className="grid sm:grid-cols-[1fr_auto] gap-2 sm:gap-6 py-3.5 text-sm">
                  <div className="min-w-0">
                    <p><span className={buying ? "text-buy font-medium" : "text-sell font-medium"}>{buying ? "Bought" : "Sold"}</span> · <Link href={`/events/${deal.event.id}`} className="hover:underline">{deal.event.name}</Link></p>
                    <p className="text-xs text-muted mt-1">With <Link href={`/admin/users/${other.id}`} className="hover:underline">{other.name ?? other.email}</Link> · {deal._count.messages} messages · {deal._count.ratings} ratings</p>
                  </div>
                  <div className="sm:text-right tabular-nums">
                    <p>{deal.quantity} × {formatPrice(deal.unitPriceCents)} · {formatPrice(deal.quantity * deal.unitPriceCents)}</p>
                    <p className="text-xs text-muted mt-1">{deal.status.toLowerCase()} · {formatDateTime(deal.completedAt ?? deal.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="py-7">
        <div className="flex items-baseline justify-between mb-3"><h2 className="font-medium">Listing history</h2><span className="text-sm text-muted">{listings.length}</span></div>
        {listings.length === 0 ? <p className="text-sm text-muted">No listings.</p> : (
          <div className="divide-y divide-line border-y border-line">
            {listings.map((listing) => (
              <div key={listing.id} className="grid grid-cols-[1fr_auto] gap-4 py-3.5 text-sm">
                <div className="min-w-0"><Link href={`/events/${listing.event.id}`} className="font-medium hover:underline">{listing.event.name}</Link><p className="text-xs text-muted mt-1">{listing.status.toLowerCase()} · {listing.availableQuantity} of {listing.quantity} available</p></div>
                <div className="text-right tabular-nums"><p>{formatPrice(listing.priceCents)} each</p><p className="text-xs text-muted mt-1">{formatDate(listing.createdAt)}</p></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function AccountFact({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-muted">{label}</dt><dd className="mt-0.5 break-words">{value}</dd></div>;
}
