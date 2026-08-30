import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, isOnboarded } from "@/lib/session";
import { getBestAskCents, getBestBidCents } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
import OrderForm from "./OrderForm";

export default async function NewOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ side?: string }>;
}) {
  const { id } = await params;
  const { side: sideParam } = await searchParams;
  const user = await requireUser();
  if (!isOnboarded(user)) redirect("/onboarding");

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();
  if (event.archivedAt) redirect(`/events/${id}`);

  const side: "buy" | "sell" = sideParam === "sell" ? "sell" : "buy";
  const [bestAskCents, bestBidCents] = await Promise.all([
    getBestAskCents(id),
    getBestBidCents(id),
  ]);

  return (
    <main className="max-w-lg mx-auto px-5 py-10">
      <Link href={`/events/${id}`} className="text-sm text-muted hover:text-ink">
        ← {event.name}
      </Link>
      <h1 className="font-serif text-3xl mt-3 mb-1">
        {side === "buy" ? "Buy" : "Sell"} tickets to {event.name}
      </h1>
      <p className="text-sm text-muted mb-5">
        {formatDateTime(event.startsAt)}
        {event.venue ? ` · ${event.venue}` : ""} · comes down the day after the event.
      </p>

      {/* Buy / Sell toggle */}
      <div className="inline-flex rounded-lg border border-line overflow-hidden mb-5 text-sm">
        <Link
          href={`/events/${id}/order?side=buy`}
          className={`px-4 py-1.5 font-medium ${
            side === "buy" ? "bg-buy text-white" : "text-muted hover:text-ink"
          }`}
        >
          I&apos;m buying
        </Link>
        <Link
          href={`/events/${id}/order?side=sell`}
          className={`px-4 py-1.5 font-medium border-l border-line ${
            side === "sell" ? "bg-sell text-white" : "text-muted hover:text-ink"
          }`}
        >
          I&apos;m selling
        </Link>
      </div>

      <div className="bg-white border border-line rounded-2xl p-6">
        <OrderForm
          eventId={id}
          side={side}
          bestAskCents={bestAskCents}
          bestBidCents={bestBidCents}
        />
      </div>
    </main>
  );
}
