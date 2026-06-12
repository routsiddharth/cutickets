"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminTabLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`text-sm px-1 pb-2.5 border-b-2 transition-colors ${
        active
          ? "border-columbia-deep text-ink font-medium"
          : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}
