"use client";

import { useRef, useState } from "react";
import { hexToRgba } from "@/lib/color/hex";

// A 3D parallax tilt that tracks the cursor rather than toggling on hover, so
// the poster reads as an object in the room instead of a flat hover state.
const MAX_TILT_DEG = 12;

export default function PosterTilt({ src, accent }: { src: string; accent: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x, y });
  };

  const rotateY = tilt ? tilt.x * MAX_TILT_DEG : 0;
  // Negated so pushing the cursor toward the top tips the top of the poster away.
  const rotateX = tilt ? -tilt.y * MAX_TILT_DEG : 0;

  return (
    <div
      ref={wrapperRef}
      style={{ perspective: "1000px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt(null)}
    >
      <div
        className="relative aspect-[4/5] rounded-xl overflow-hidden border border-line"
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`,
          boxShadow: tilt
            ? `0 30px 60px ${hexToRgba(accent, 0.24)}`
            : `0 12px 30px ${hexToRgba(accent, 0.14)}`,
          // Short while tracking so it feels attached to the cursor without
          // jittering between mousemove events; longer on release so it eases
          // back to flat instead of snapping.
          transition: tilt
            ? "transform 80ms ease-out, box-shadow 300ms ease-out"
            : "transform 500ms ease-out, box-shadow 300ms ease-out",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    </div>
  );
}
