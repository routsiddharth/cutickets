import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { flyerUrl } from "@/lib/flyer";
import EditEventForm from "./EditEventForm";
import FlyerUploadForm from "./FlyerUploadForm";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();
  return (
    <main className="max-w-lg mx-auto px-5 py-10">
      <Link href="/admin/events" className="text-sm text-muted hover:text-ink">← Admin events</Link>
      <h1 className="font-serif text-3xl mt-3 mb-1">Edit event</h1>
      <p className="text-sm text-muted mb-7">Changes appear immediately on the event market.</p>
      <div className="mb-6">
        <FlyerUploadForm eventId={event.id} flyerUrl={flyerUrl(event.id, event.flyerUpdatedAt)} />
      </div>
      <EditEventForm event={{
        id: event.id,
        name: event.name,
        venue: event.venue,
        startsAt: event.startsAt?.toISOString().slice(0, 10) ?? "",
        startsTime: event.startsAt
          ? `${String(event.startsAt.getHours()).padStart(2, "0")}:${String(event.startsAt.getMinutes()).padStart(2, "0")}`
          : "",
        description: event.description,
        poshLink: event.poshLink,
      }} />
    </main>
  );
}
