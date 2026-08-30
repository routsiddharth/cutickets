"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminTabLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`inline-flex items-center min-h-11 text-sm px-1 border-b-2 whitespace-nowrap transition-colors ${
        active
          ? "border-columbia-deep text-ink font-medium"
          : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
}
