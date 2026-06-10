import InterestButton from "@/components/InterestButton";
import CancelListingButton from "@/components/CancelListingButton";
import { formatPrice, relativeExpiry } from "@/lib/format";
import type { MarketListing } from "@/lib/queries";
import type { MatchStatus } from "@/lib/constants";

type MatchState = "NONE" | MatchStatus;

/**
 * A market listing card. The market is anonymous: a card shows only the ticket
 * terms and price — never who posted it. Identity is revealed on the deal desk
 * once a match is accepted. Keep this component identity-free by construction;
 * `MarketListing` no longer even carries the lister's user record.
 */
export default function ListingCard({
  listing,
  variant,
  isOwner,
  matchState,
}: {
  listing: MarketListing;
  variant: "sell" | "buy";
  isOwner: boolean;
  matchState: MatchState;
}) {
  const tone = variant === "sell" ? "text-sell" : "text-buy";
  const qtyLabel =
    variant === "sell"
      ? `${listing.quantity} ticket${listing.quantity === 1 ? "" : "s"}`
      : `wants ${listing.quantity}`;
  const actionLabel = variant === "sell" ? "I'm interested" : "I can sell";

  return (
    <div className="rounded-xl border bg-white border-line p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm">
          <span className={`font-medium ${tone}`}>{qtyLabel}</span>
          <span className="text-muted"> · anonymous student</span>
        </p>
        {listing.notes && (
          <p className="text-xs text-muted mt-1.5 line-clamp-2 italic">
            “{listing.notes}”
          </p>
        )}
        <p className="text-[11px] text-muted mt-1">{relativeExpiry(listing.expiresAt)}</p>
      </div>

      <div className="text-right shrink-0">
        <p className="font-serif text-2xl tabular-nums leading-none">
          {formatPrice(listing.priceCents)}
          <span className="text-sm text-muted">/ea</span>
        </p>
        {isOwner ? (
          <div className="mt-1">
            <span className="block text-[11px] text-muted mb-1">your listing</span>
            <CancelListingButton listingId={listing.id} />
          </div>
        ) : matchState === "NONE" ? (
          <InterestButton listingId={listing.id} label={actionLabel} variant={variant} />
        ) : (
          <span className="inline-block text-xs px-3 py-1.5 rounded-md mt-1 font-medium bg-columbia-soft text-columbia-deep">
            {matchState === "ACCEPTED" || matchState === "COMPLETED"
              ? "Matched ✓"
              : matchState === "DECLINED"
                ? "Declined"
                : "Reached out ✓"}
          </span>
        )}
      </div>
    </div>
  );
}
