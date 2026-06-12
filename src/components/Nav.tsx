import Link from "next/link";
import Image from "next/image";
import type { User } from "@prisma/client";
import Avatar from "@/components/Avatar";
import { isAdmin } from "@/lib/admin";

export default function Nav({ user, unread = 0 }: { user: User; unread?: number }) {
  return (
    <header className="bg-white border-b border-line sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-5 sm:px-7 h-24 flex items-center justify-between gap-4">
        <Link href="/events" className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo.png"
            alt=""
            width={80}
            height={80}
            priority
            className="h-20 w-auto"
          />
          <span className="font-serif text-lg text-ink">CUTickets</span>
        </Link>

        <nav className="hidden sm:flex items-center gap-5 text-sm text-muted ml-2 mr-auto">
          <Link href="/events" className="hover:text-ink">
            Events
          </Link>
          <Link href="/matches" className="hover:text-ink">
            My matches
          </Link>
          {isAdmin(user) && (
            <Link href="/admin/events" className="hover:text-ink font-medium text-columbia-deep">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
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
        </div>
      </div>
    </header>
  );
}
