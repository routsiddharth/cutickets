"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";

export type CelebrationMatch = {
  id: string;
  iAmBuyer: boolean;
  reservedQuantity: number;
  settlePriceCents: number;
  eventName: string;
};

const STORAGE_KEY = "morningside-tickets:celebrated-matches";

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSeen(ids: Set<string>) {
  try {
    // Keep the list bounded so it can't grow forever.
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids].slice(-200)));
  } catch {
    /* storage unavailable — animation just replays, no harm */
  }
}

// Confetti palette pulled from the brand tokens (buy / sell / columbia / ink).
const CONFETTI = ["#A8651A", "#1F7A63", "#5B8FB9", "#14233D", "#3D6E97"];

export default function MatchCelebration({ matches }: { matches: CelebrationMatch[] }) {
  // Which fresh matches to celebrate — decided client-side after mount so the
  // server render stays stable and localStorage is available.
  const [fresh, setFresh] = useState<CelebrationMatch[] | null>(null);

  useEffect(() => {
    const seen = readSeen();
    const unseen = matches.filter((m) => !seen.has(m.id));
    if (unseen.length === 0) return;

    // Mark them seen immediately so a refresh mid-animation won't replay it.
    const next = new Set(seen);
    matches.forEach((m) => next.add(m.id));
    writeSeen(next);

    setFresh(unseen);
    // We only want this to run against the first matches snapshot of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!fresh || fresh.length === 0) return null;
  return <Overlay matches={fresh} onClose={() => setFresh(null)} />;
}

function Overlay({
  matches,
  onClose,
}: {
  matches: CelebrationMatch[];
  onClose: () => void;
}) {
  // Lead with the most recent match; note if more are waiting behind it.
  const hero = matches[0];
  const extra = matches.length - 1;

  const confetti = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        dur: 1.6 + Math.random() * 1.2,
        spin: `${Math.random() > 0.5 ? "" : "-"}${360 + Math.random() * 360}deg`,
        color: CONFETTI[i % CONFETTI.length],
      })),
    [],
  );

  // Dismiss on Escape for keyboard users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="mc-overlay" role="dialog" aria-modal="true" aria-label="It's a match">
      <div className="mc-scrim" onClick={onClose} />

      <div className="mc-confetti" aria-hidden="true">
        {confetti.map((c, i) => (
          <i
            key={i}
            style={
              {
                left: `${c.left}%`,
                background: c.color,
                "--delay": `${c.delay}s`,
                "--dur": `${c.dur}s`,
                "--spin": c.spin,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="mc-card">
        <p className="mc-eyebrow">Your price met theirs</p>
        <h2 className="mc-title">It&apos;s a match.</h2>
        <p className="mc-detail">
          {hero.iAmBuyer ? "Buying" : "Selling"} {hero.reservedQuantity}
          {hero.reservedQuantity === 1 ? " ticket" : " tickets"} · {hero.eventName}
        </p>
        <p className="mc-price">
          {formatPrice(hero.settlePriceCents)}
          <span>/ea</span>
        </p>

        <div className="mc-actions">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-columbia-deep text-white py-3 rounded-lg font-medium hover:bg-columbia-deep/90"
          >
            {extra > 0 ? `See your matches (${matches.length})` : "Confirm the match →"}
          </button>
          {extra > 0 && (
            <p className="text-xs text-muted mt-2">
              +{extra} more {extra === 1 ? "match" : "matches"} waiting below
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
