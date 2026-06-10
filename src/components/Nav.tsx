import Link from "next/link";
import type { User } from "@prisma/client";
import Avatar from "@/components/Avatar";
import SignOutButton from "@/components/SignOutButton";
import { schoolAbbrev } from "@/lib/format";

export default function Nav({ user, unread = 0 }: { user: User; unread?: number }) {
  return (
    <header className="bg-white border-b border-line sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-5 sm:px-7 h-14 flex items-center justify-between gap-4">
        <Link href="/events" className="font-serif text-lg shrink-0">
          CUTickets
        </Link>

        <nav className="hidden sm:flex items-center gap-5 text-sm text-muted ml-2 mr-auto">
          <Link href="/events" className="hover:text-ink">
            Events
          </Link>
          <Link href="/matches" className="hover:text-ink">
            My matches
          </Link>
          <Link href="/listings/new" className="hover:text-ink">
            Post
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user.school && (
            <span className="hidden sm:inline-block text-xs bg-columbia-soft text-columbia-deep px-2.5 py-1 rounded-full font-medium">
              ✓ {schoolAbbrev(user.school, user.classYear)}
            </span>
          )}
          <Link
            href="/notifications"
            aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
            className="relative text-muted hover:text-ink text-lg leading-none"
          >
            <span aria-hidden>🔔</span>
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-columbia-deep text-white text-[10px] font-semibold tabular-nums">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link href={`/profile/${user.id}`} aria-label="Your profile">
            <Avatar name={user.name} email={user.email} image={user.image} size={32} />
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
