import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { formatDateTime, formatPrice } from "@/lib/format";

export default async function AdminDealPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireUser();
  if (!isAdmin(admin)) notFound();
  const { id } = await params;

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      event: { select: { id: true, name: true } },
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, name: true, email: true } } },
      },
      ratings: { include: { author: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!deal) notFound();

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-7 py-8">
      <Link href="/admin/deals" className="text-sm text-muted hover:text-ink">← Sale history</Link>

      <header className="mt-4 pb-6 border-b border-line">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h1 className="font-serif text-2xl">
            <Link href={`/events/${deal.event.id}`} className="hover:underline">{deal.event.name}</Link>
          </h1>
          <span className="text-xs text-muted">{deal.status.charAt(0) + deal.status.slice(1).toLowerCase()}</span>
        </div>
        <p className="text-sm mt-2">
          <Link href={`/admin/users/${deal.buyer.id}`} className="hover:underline">{deal.buyer.name ?? deal.buyer.email}</Link>
          <span className="text-muted"> bought from </span>
          <Link href={`/admin/users/${deal.seller.id}`} className="hover:underline">{deal.seller.name ?? deal.seller.email}</Link>
        </p>
        <p className="text-sm text-muted mt-1">
          {deal.quantity} × {formatPrice(deal.unitPriceCents)} · {formatPrice(deal.quantity * deal.unitPriceCents)} · {formatDateTime(deal.createdAt)}
        </p>
        {deal.status === "COMPLETED" && deal.completedAt && (
          <p className="text-xs text-muted mt-2">Completed {formatDateTime(deal.completedAt)}</p>
        )}
      </header>

      <section className="py-6 border-b border-line">
        <h2 className="text-sm font-medium mb-3">Messages ({deal.messages.length})</h2>
        {deal.messages.length === 0 ? (
          <p className="text-sm text-muted">No messages.</p>
        ) : (
          <div className="space-y-3">
            {deal.messages.map((message) =>
              message.kind === "EVENT" ? (
                <p key={message.id} className="text-center text-xs text-muted">{message.body}</p>
              ) : (
                <div key={message.id} className="text-sm">
                  <p className="text-xs text-muted">
                    {message.sender.name ?? message.sender.email} · {formatDateTime(message.createdAt)}
                  </p>
                  <p className="mt-0.5">{message.body}</p>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {deal.ratings.length > 0 && (
        <section className="py-6">
          <h2 className="text-sm font-medium mb-3">Ratings</h2>
          <div className="space-y-2">
            {deal.ratings.map((rating) => (
              <p key={rating.id} className="text-sm">
                <Link href={`/admin/users/${rating.author.id}`} className="hover:underline">{rating.author.name ?? rating.author.email}</Link>
                <span className="text-muted"> — {"★".repeat(rating.stars)}{rating.comment ? ` “${rating.comment}”` : ""}</span>
              </p>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
