import Link from "next/link";
import EventForm from "./EventForm";

export default function NewEventPage() {
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
        <EventForm />
      </div>
    </main>
  );
}
