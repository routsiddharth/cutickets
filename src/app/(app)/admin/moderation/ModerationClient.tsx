"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { adminKillListing, adminCancelDeal } from "@/lib/actions/admin";

type ListingRow = {
  id: string;
  priceFmt: string;
  availableQuantity: number;
  createdAt: string;
  seller: { name: string | null; email: string };
  event: { id: string; name: string };
};

type DealRow = {
  id: string;
  status: string;
  priceFmt: string;
  quantity: number;
  createdAt: string;
  event: { name: string };
  buyer: { name: string | null; email: string };
  seller: { name: string | null; email: string };
};

const btnBase = "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60";
const btnDanger = `${btnBase} bg-red-50 text-red-700 hover:bg-red-100 border border-red-200`;
const btnGhost = `${btnBase} border border-line text-muted hover:text-ink`;

function KillListingForm({ listingId, onDone }: { listingId: string; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    startTransition(async () => {
      const result = await adminKillListing(listingId, reason.trim() || undefined);
      if (result?.error) setError(result.error);
      else onDone();
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-line space-y-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional — sent to the user)"
        rows={2}
        className="w-full border border-line rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-columbia"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} className={btnDanger}>
          Confirm kill
        </button>
        <button onClick={onDone} className={btnGhost}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function CancelTradeForm({ dealId, onDone }: { dealId: string; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    startTransition(async () => {
      const result = await adminCancelDeal(dealId, reason.trim() || undefined);
      if (result?.error) setError(result.error);
      else onDone();
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-line space-y-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional — sent to both parties)"
        rows={2}
        className="w-full border border-line rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-columbia"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} className={btnDanger}>
          Confirm cancel
        </button>
        <button onClick={onDone} className={btnGhost}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

function ListingRow({ listing }: { listing: ListingRow }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            <Link href={`/events/${listing.event.id}`} className="hover:underline text-columbia-deep">
              {listing.event.name}
            </Link>
            <span className="ml-2 text-xs text-muted font-normal">
              {listing.priceFmt} · {listing.availableQuantity} available
            </span>
          </p>
          <p className="text-xs text-muted mt-0.5">
            {listing.seller.name ?? listing.seller.email} · {listing.seller.email}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className={btnDanger}
        >
          {expanded ? "Dismiss" : "Kill listing"}
        </button>
      </div>
      {expanded && (
        <KillListingForm listingId={listing.id} onDone={() => setExpanded(false)} />
      )}
    </div>
  );
}

function DealRow({ deal }: { deal: DealRow }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {deal.event.name}
            <span className="ml-2 text-xs text-muted font-normal">
              {deal.status} · {deal.priceFmt} · {deal.quantity} ticket{deal.quantity !== 1 ? "s" : ""}
            </span>
          </p>
          <p className="text-xs text-muted mt-0.5">
            Buyer: {deal.buyer.name ?? deal.buyer.email} · Seller: {deal.seller.name ?? deal.seller.email}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className={btnDanger}
        >
          {expanded ? "Dismiss" : "Cancel trade"}
        </button>
      </div>
      {expanded && (
        <CancelTradeForm dealId={deal.id} onDone={() => setExpanded(false)} />
      )}
    </div>
  );
}

export default function ModerationClient({
  listings,
  deals,
}: {
  listings: ListingRow[];
  deals: DealRow[];
}) {
  const [filter, setFilter] = useState("");
  const q = filter.toLowerCase();

  const filteredListings = listings.filter(
    (l) =>
      !q ||
      l.event.name.toLowerCase().includes(q) ||
      (l.seller.name ?? "").toLowerCase().includes(q) ||
      l.seller.email.toLowerCase().includes(q),
  );

  const filteredDeals = deals.filter(
    (m) =>
      !q ||
      m.event.name.toLowerCase().includes(q) ||
      (m.buyer.name ?? "").toLowerCase().includes(q) ||
      m.buyer.email.toLowerCase().includes(q) ||
      (m.seller.name ?? "").toLowerCase().includes(q) ||
      m.seller.email.toLowerCase().includes(q),
  );

  return (
    <div className="space-y-10">
      <input
        type="search"
        placeholder="Filter by event, user, or email…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-columbia"
      />

      {/* Open listings */}
      <section>
        <p className="tag text-muted mb-3">
          Open listings{filteredListings.length > 0 ? ` · ${filteredListings.length}` : ""}
        </p>
        {filteredListings.length === 0 ? (
          <div className="bg-white border border-dashed border-line rounded-xl p-6 text-center text-sm text-muted">
            {filter ? "No listings match this filter." : "No open listings."}
          </div>
        ) : (
          <div className="bg-white border border-line rounded-2xl divide-y divide-line overflow-hidden">
            {filteredListings.map((l) => (
              <ListingRow key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      {/* Active deals */}
      <section>
        <p className="tag text-muted mb-3">
          Active deals{filteredDeals.length > 0 ? ` · ${filteredDeals.length}` : ""}
        </p>
        {filteredDeals.length === 0 ? (
          <div className="bg-white border border-dashed border-line rounded-xl p-6 text-center text-sm text-muted">
            {filter ? "No deals match this filter." : "No active deals."}
          </div>
        ) : (
          <div className="bg-white border border-line rounded-2xl divide-y divide-line overflow-hidden">
            {filteredDeals.map((deal) => (
              <DealRow key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
