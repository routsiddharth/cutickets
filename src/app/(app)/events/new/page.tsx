import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import EventForm from "./EventForm";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ requestId?: string }>;
}) {
  const user = await requireUser();
  if (!isAdmin(user)) notFound();
  const { requestId } = await searchParams;
  const request = requestId
    ? await prisma.eventRequest.findFirst({ where: { id: requestId, status: "PENDING" } })
    : null;

  return (
    <main className="max-w-lg mx-auto px-5 py-10">
      <Link href="/events" className="text-sm text-muted hover:text-ink">
        ← Events
      </Link>
      <h1 className="font-serif text-3xl mt-3 mb-1">Add an event</h1>
      <p className="text-sm text-muted mb-7">
        Start a mini-market. Once it exists, anyone can post buy/sell listings on
        it.
      </p>
      <div className="bg-white border border-line rounded-2xl p-6">
        <EventForm
          requestId={request?.id}
          defaults={request ? {
            name: request.name,
            venue: request.venue ?? undefined,
            startsAt: request.startsAt?.toISOString().slice(0, 10),
            startsTime: request.startsAt
              ? `${String(request.startsAt.getHours()).padStart(2, "0")}:${String(request.startsAt.getMinutes()).padStart(2, "0")}`
              : undefined,
            description: request.details ?? undefined,
          } : undefined}
        />
      </div>
    </main>
  );
}
