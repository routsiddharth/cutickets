import Link from "next/link";
import EventRequestForm from "./EventRequestForm";

export default async function RequestEventPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const { name } = await searchParams;
  return (
    <main className="max-w-lg mx-auto px-5 py-10">
      <Link href="/events" className="text-sm text-muted hover:text-ink">← Events</Link>
      <h1 className="font-serif text-3xl mt-3 mb-7">Request an event</h1>
      <EventRequestForm defaultName={name?.slice(0, 120)} />
    </main>
  );
}
