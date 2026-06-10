import Link from "next/link";
import Avatar from "@/components/Avatar";
import InterestButton from "@/components/InterestButton";
import CancelListingButton from "@/components/CancelListingButton";
import { formatPrice, publicName, schoolAbbrev, relativeExpiry } from "@/lib/format";
import { isNewAccount } from "@/lib/reputation";
import type { MarketListing } from "@/lib/queries";
import type { MatchStatus } from "@/lib/constants";

type MatchState = "NONE" | MatchStatus;

function RepLine({
  ratingAvg,
  ratingCount,
  trades,
  createdAt,
  quantityLabel,
  variant,
}: {
  ratingAvg: number | null;
  ratingCount: number;
  trades: number;
  createdAt: Date;
  quantityLabel: string;
  variant: "sell" | "buy";
}) {
  const parts: string[] = [];
  if (ratingAvg !== null) parts.push(`★ ${ratingAvg.toFixed(1)}`);
  if (trades > 0) parts.push(`${trades} trade${trades === 1 ? "" : "s"}`);
  if (parts.length === 0) {
    parts.push(isNewAccount(createdAt) ? "new account" : "no trades yet");
  }
  const tone = variant === "sell" ? "text-sell" : "text-buy";
  return (
    <p className="text-xs text-muted">
      {parts.join(" · ")} · <span className={tone}>{quantityLabel}</span>
    </p>
  );
}

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
  const owner = listing.user;
  const qtyLabel =
    variant === "sell"
      ? `${listing.quantity} ticket${listing.quantity === 1 ? "" : "s"}`
      : `wants ${listing.quantity}`;
  const actionLabel = variant === "sell" ? "I'm interested" : "I can sell";

  return (
    <div className="rounded-xl border bg-white border-line p-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <Avatar name={owner.name} image={owner.image} size={36} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            <Link href={`/profile/${owner.id}`} className="hover:underline">
              {publicName(owner.name)}
            </Link>{" "}
            <span className="text-xs text-columbia-deep">
              · {schoolAbbrev(owner.school, owner.classYear)}
            </span>
          </p>
          <RepLine
            ratingAvg={listing.ownerRatingAvg}
            ratingCount={listing.ownerRatingCount}
            trades={listing.ownerTrades}
            createdAt={owner.createdAt}
            quantityLabel={qtyLabel}
            variant={variant}
          />
          {listing.notes && (
            <p className="text-xs text-muted mt-1.5 line-clamp-2 italic">
              “{listing.notes}”
            </p>
          )}
          <p className="text-[11px] text-muted mt-1">{relativeExpiry(listing.expiresAt)}</p>
        </div>
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
