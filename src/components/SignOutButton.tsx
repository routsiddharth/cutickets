"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className={className ?? "text-sm text-muted hover:text-ink"}
    >
      Sign out
    </button>
  );
}
