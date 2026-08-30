import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import ListingForm from "./ListingForm";

export default async function SellTicketsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();
  if (event.archivedAt) redirect(`/events/${id}`);

  return (
    <main className="max-w-xl mx-auto px-5 sm:px-7 py-8">
      <Link href={`/events/${id}`} className="text-sm text-muted hover:text-ink">← {event.name}</Link>
      <h1 className="font-serif text-3xl mt-4">Sell tickets</h1>
      <p className="text-sm text-muted mt-1 mb-6">{formatDateTime(event.startsAt)}{event.venue ? ` · ${event.venue}` : ""}</p>
      <div className="bg-white border border-line rounded-xl p-5 sm:p-6">
        <ListingForm eventId={event.id} />
      </div>
    </main>
  );
}
