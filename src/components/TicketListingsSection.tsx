"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";
import CancelListingButton from "@/components/CancelListingButton";
import ReserveListingForm from "@/components/ReserveListingForm";

export type OpenRow = {
  id: string;
  priceCents: number;
  quantity: number;
  mine: boolean;
  dateLabel: string;
  postedAtMs: number;
};

export type SoldRow = {
  id: string;
  priceCents: number;
  quantity: number;
  dateLabel: string;
  completedAtMs: number;
};

type SortKey = "price-asc" | "price-desc" | "newest" | "oldest";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

function sortByKey<T extends { priceCents: number; timeMs: number }>(rows: T[], sort: SortKey): T[] {
  const sorted = [...rows];
  switch (sort) {
    case "price-asc":
      sorted.sort((a, b) => a.priceCents - b.priceCents);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.priceCents - a.priceCents);
      break;
    case "newest":
      sorted.sort((a, b) => b.timeMs - a.timeMs);
      break;
    case "oldest":
      sorted.sort((a, b) => a.timeMs - b.timeMs);
      break;
  }
  return sorted;
}

function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortKey)}
        aria-label="Sort order"
        className="appearance-none bg-card border border-line rounded-full pl-4 pr-9 py-2 text-sm text-ink-secondary cursor-pointer hover:border-ink/30"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted"
        viewBox="0 0 12 12"
        fill="none"
      >
        <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function TabSwitcher({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  if (tabs.length < 2) {
    return <p className="text-sm font-semibold text-ink px-1">{tabs[0]?.label}</p>;
  }
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full bg-ink/5 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`rounded-full px-4 py-2 text-sm transition-colors ${
            active === tab.key ? "bg-card text-ink font-semibold shadow-sm" : "text-muted font-medium hover:text-ink"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default function TicketListingsSection({ openRows, soldRows }: { openRows: OpenRow[]; soldRows: SoldRow[] }) {
  const [tab, setTab] = useState<"open" | "sold">(openRows.length > 0 ? "open" : "sold");
  const [sortOpen, setSortOpen] = useState<SortKey>("price-asc");
  const [sortSold, setSortSold] = useState<SortKey>("newest");

  const tabs = [
    { key: "open", label: `Listings · ${openRows.length}` },
    { key: "sold", label: `Sold · ${soldRows.length}` },
  ];
  const activeTab = tab;

  const sortedOpen = useMemo(
    () => sortByKey(openRows.map((row) => ({ ...row, timeMs: row.postedAtMs })), sortOpen),
    [openRows, sortOpen]
  );
  const sortedSold = useMemo(
    () => sortByKey(soldRows.map((row) => ({ ...row, timeMs: row.completedAtMs })), sortSold),
    [soldRows, sortSold]
  );

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-5">
        <TabSwitcher tabs={tabs} active={activeTab} onChange={(key) => setTab(key as "open" | "sold")} />
        {activeTab === "open" ? (
          <SortSelect value={sortOpen} onChange={setSortOpen} />
        ) : (
          <SortSelect value={sortSold} onChange={setSortSold} />
        )}
      </div>

      {activeTab === "open" ? (
        sortedOpen.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No open listings right now.</p>
        ) : (
          <div className="divide-y divide-line">
            {sortedOpen.map((row) => (
              <div key={row.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5">
                <p className="font-serif text-4xl sm:text-5xl tabular-nums text-ink">{formatPrice(row.priceCents)}</p>
                <div className="min-w-0">
                  <p className="text-[15px] sm:text-base font-semibold text-ink">
                    {row.quantity} ticket{row.quantity === 1 ? "" : "s"}
                    {row.mine ? " · your listing" : ""}
                  </p>
                  <p className="text-sm text-muted mt-1">Posted {row.dateLabel}</p>
                </div>
                <div className="justify-self-end">
                  {row.mine ? (
                    <CancelListingButton listingId={row.id} />
                  ) : (
                    <ReserveListingForm listingId={row.id} available={row.quantity} priceCents={row.priceCents} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : sortedSold.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No sales yet.</p>
      ) : (
        <div className="divide-y divide-line">
          {sortedSold.map((row) => (
            <div key={row.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5">
              <p className="font-serif text-4xl sm:text-5xl tabular-nums text-ink-tertiary">
                {formatPrice(row.priceCents)}
              </p>
              <div className="min-w-0">
                <p className="text-[15px] sm:text-base font-semibold text-ink">
                  {row.quantity} ticket{row.quantity === 1 ? "" : "s"}
                </p>
                <p className="text-sm text-muted mt-1">Sold {row.dateLabel}</p>
              </div>
              <div className="justify-self-end">
                <span className="tag text-muted">GONE</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
