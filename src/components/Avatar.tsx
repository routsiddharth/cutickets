"use client";

import { useState } from "react";
import { initials } from "@/lib/format";

export default function Avatar({
  name,
  email,
  image,
  size = 36,
  className = "",
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: number;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const dim = { width: size, height: size };
  if (image && !imageFailed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt=""
        style={dim}
        onError={() => setImageFailed(true)}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }
  return (
    <div
      style={{ ...dim, fontSize: Math.round(size * 0.36) }}
      className={`rounded-full bg-ink text-white grid place-items-center font-semibold shrink-0 ${className}`}
    >
      {initials(name, email)}
    </div>
  );
}
