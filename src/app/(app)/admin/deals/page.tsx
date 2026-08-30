import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { DEAL_STATUSES, type DealStatus } from "@/lib/constants";
import { formatDateTime, formatPrice } from "@/lib/format";

const PAGE_SIZE = 50;

export default async function AdminDealsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const query = params.q?.trim() || undefined;
  const status = DEAL_STATUSES.includes(params.status as DealStatus) ? params.status as DealStatus : undefined;
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const where: Prisma.DealWhereInput = {
    ...(status ? { status } : {}),
    ...(query ? { OR: [
      { event: { name: { contains: query, mode: "insensitive" } } },
      { buyer: { name: { contains: query, mode: "insensitive" } } },
      { buyer: { email: { contains: query, mode: "insensitive" } } },
      { seller: { name: { contains: query, mode: "insensitive" } } },
      { seller: { email: { contains: query, mode: "insensitive" } } },
    ] } : {}),
  };

  const total = await prisma.deal.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const deals = await prisma.deal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      event: { select: { id: true, name: true } },
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true, ratings: true } },
    },
  });

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-7 py-8">
      <h1 className="font-serif text-3xl">Sale history</h1>
      <p className="text-sm text-muted mt-1 mb-6">{total}{query || status ? " matching" : " total"}</p>

      <form action="/admin/deals" className="grid sm:grid-cols-[1fr_160px_auto] gap-2 mb-6">
        <input type="search" name="q" defaultValue={query ?? ""} placeholder="Search event, name, or email…" aria-label="Search sales" className="min-w-0 bg-white border border-line rounded-lg px-3.5 py-2.5 text-sm" />
        <select name="status" defaultValue={status ?? ""} aria-label="Sale status" className="bg-white border border-line rounded-lg px-3 py-2.5 text-sm">
          <option value="">All statuses</option>
          {DEAL_STATUSES.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
        </select>
        <div className="flex gap-2">
          <button className="bg-columbia text-white rounded-lg px-4 py-2.5 text-sm font-medium">Filter</button>
          {(query || status) && <Link href="/admin/deals" className="border border-line bg-white rounded-lg px-4 py-2.5 text-sm text-muted">Clear</Link>}
        </div>
      </form>

      {deals.length === 0 ? (
        <div className="border-y border-line py-8 text-sm text-muted">No sales match those filters.</div>
      ) : (
        <div className="divide-y divide-line border-y border-line">
          {deals.map((deal) => (
            <article key={deal.id} className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <Link href={`/events/${deal.event.id}`} className="font-medium hover:underline break-words">{deal.event.name}</Link>
                    <span className="text-xs text-muted">{statusLabel(deal.status)}</span>
                  </div>
                  <p className="text-sm mt-2">
                    <Link href={`/admin/users/${deal.buyer.id}`} className="hover:underline">{deal.buyer.name ?? "No name"}</Link>
                    <span className="text-muted"> ({deal.buyer.email})</span>
                    <span className="text-muted"> bought from </span>
                    <Link href={`/admin/users/${deal.seller.id}`} className="hover:underline">{deal.seller.name ?? "No name"}</Link>
                    <span className="text-muted"> ({deal.seller.email})</span>
                  </p>
                  <p className="text-xs text-muted mt-1">{deal._count.messages} messages · {deal._count.ratings} ratings · {formatDateTime(deal.createdAt)}</p>
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <p className="font-medium">{formatPrice(deal.quantity * deal.unitPriceCents)}</p>
                  <p className="text-xs text-muted mt-1">{deal.quantity} × {formatPrice(deal.unitPriceCents)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {total > PAGE_SIZE && (
        <nav className="flex items-center justify-between mt-5 text-sm" aria-label="Sale pages">
          {page > 1 ? <Link href={dealPageHref(page - 1, query, status)} className="text-columbia-deep hover:underline">← Previous</Link> : <span />}
          <span className="text-muted tabular-nums">Page {page} of {pageCount}</span>
          {page * PAGE_SIZE < total ? <Link href={dealPageHref(page + 1, query, status)} className="text-columbia-deep hover:underline">Next →</Link> : <span />}
        </nav>
      )}
    </main>
  );
}

function dealPageHref(page: number, query?: string, status?: DealStatus): string {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("q", query);
  if (status) params.set("status", status);
  return `/admin/deals?${params}`;
}

function statusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}
