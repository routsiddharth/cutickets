import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LISTING_TYPES, type ListingType } from "@/lib/constants";
import ListingForm from "./ListingForm";

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; type?: string }>;
}) {
  const { eventId, type } = await searchParams;

  const events = await prisma.event.findMany({
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true },
    take: 200,
  });

  const defaultType: ListingType = LISTING_TYPES.includes(type as ListingType)
    ? (type as ListingType)
    : "SELL";
  const defaultEventId = events.some((e) => e.id === eventId) ? eventId : undefined;

  return (
    <main className="max-w-lg mx-auto px-5 py-10">
      <Link href="/events" className="text-sm text-muted hover:text-ink">
        ← Events
      </Link>
      <h1 className="font-serif text-3xl mt-3 mb-1">Post a listing</h1>
      <p className="text-sm text-muted mb-7">
        Tell the board what you need. Buying or selling, your price, when it
        expires.
      </p>

      {events.length === 0 ? (
        <div className="bg-white border border-line rounded-2xl p-8 text-center">
          <p className="font-serif text-xl mb-1">No events yet.</p>
          <p className="text-sm text-muted mb-5">
            Add an event first, then post your listing on it.
          </p>
          <Link
            href="/events/new"
            className="inline-block bg-ink text-white text-sm px-4 py-2.5 rounded-lg font-medium"
          >
            Add an event
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-line rounded-2xl p-6">
          <ListingForm
            events={events}
            defaultEventId={defaultEventId}
            defaultType={defaultType}
          />
        </div>
      )}
    </main>
  );
}
