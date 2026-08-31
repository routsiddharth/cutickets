import Link from "next/link";
import Image from "next/image";
import type { User } from "@prisma/client";
import Avatar from "@/components/Avatar";
import { isAdmin } from "@/lib/admin";

export default function Nav({ user, unread = 0 }: { user: User; unread?: number }) {
  return (
    <header className="bg-paper sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-5 sm:px-7 h-20 sm:h-24 flex items-center justify-between gap-4">
        <Link href="/events" className="flex items-center gap-2 min-w-0 shrink">
          <Image
            src="/logo.png"
            alt=""
            width={80}
            height={80}
            priority
            unoptimized
            className="h-14 sm:h-20 w-auto shrink-0"
          />
          <span className="font-serif text-sm sm:text-lg text-ink whitespace-nowrap">Morningside Tickets</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-5 text-sm text-muted ml-2 mr-auto">
          <Link href="/events" className="hover:text-ink">
            Events
          </Link>
          <Link href="/deals" className="hover:text-ink">
            My deals
          </Link>
          {isAdmin(user) && (
            <Link href="/admin/events" className="hover:text-ink font-medium text-columbia-deep">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <Link
            href="/notifications"
            aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
            className="relative text-muted hover:text-ink leading-none"
          >
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
              <path d="M10 21h4" />
            </svg>
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 grid place-items-center rounded-full bg-columbia-deep text-white text-[10px] font-semibold tabular-nums">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link href={`/profile/${user.id}`} aria-label="Your profile">
            <Avatar name={user.name} email={user.email} image={user.image} size={44} />
          </Link>
        </div>
      </div>
      <nav className="sm:hidden h-11 border-t border-line flex items-center gap-6 px-5 text-sm text-muted">
        <Link href="/events" className="hover:text-ink">Events</Link>
        <Link href="/deals" className="hover:text-ink">My deals</Link>
      </nav>
      <div className="barcode-rule" />
    </header>
  );
}
