"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendMessage, type ActionState } from "@/lib/actions/matches";
import SubmitButton from "@/components/SubmitButton";

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  kind: "TEXT" | "EVENT";
  createdAt: string; // ISO
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return "Today";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DayRule({ day }: { day: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-line" />
      <span className="tag text-muted">{day}</span>
      <div className="flex-1 h-px bg-line" />
    </div>
  );
}

/**
 * The on-site chat thread + composer. The page (a server component) re-fetches
 * messages; this component renders them straight from props so a poll-driven
 * router.refresh() shows new messages without local state drift.
 */
export default function DealChat({
  matchId,
  meId,
  themFirstName,
  messages,
}: {
  matchId: string;
  meId: string;
  themFirstName: string;
  messages: ChatMessage[];
}) {
  const router = useRouter();
  const [state, action] = useActionState<ActionState, FormData>(sendMessage, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Light polling — pull new messages every few seconds (no websocket infra).
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [router]);

  // On a successful send, clear the box and pull the freshly-saved message.
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  // Keep the thread pinned to the latest message (never use scrollIntoView).
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Group consecutive messages under day rules.
  let lastDay = "";

  return (
    <div className="bg-white border border-line rounded-2xl px-3.5 sm:px-4 pb-4 pt-1.5">
      <div
        ref={threadRef}
        className="max-h-[360px] overflow-y-auto py-3 px-0.5 flex flex-col gap-3"
      >
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted py-6">
            You&apos;re matched — say hi and sort out the handoff.
          </p>
        )}
        {messages.map((m) => {
          const day = fmtDay(m.createdAt);
          const showRule = day !== lastDay;
          lastDay = day;

          // System lifecycle events render as a centered timeline marker, never
          // a bubble — they're the transaction's audit trail in the thread.
          if (m.kind === "EVENT") {
            return (
              <div key={m.id} className="flex flex-col gap-3">
                {showRule && <DayRule day={day} />}
                <div className="flex items-center gap-2.5 my-0.5">
                  <div className="flex-1 h-px bg-line" />
                  <span className="text-[11px] text-muted text-center px-1">
                    {m.body}
                    <span className="text-muted/70"> · {fmtTime(m.createdAt)}</span>
                  </span>
                  <div className="flex-1 h-px bg-line" />
                </div>
              </div>
            );
          }

          const mine = m.senderId === meId;
          return (
            <div key={m.id} className="flex flex-col gap-3">
              {showRule && <DayRule day={day} />}
              <div className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                <div
                  className={
                    mine
                      ? "max-w-[78%] bg-ink text-paper border border-ink rounded-[14px_14px_4px_14px] px-3.5 py-2 text-sm leading-snug"
                      : "max-w-[78%] bg-white text-ink border border-line rounded-[14px_14px_14px_4px] px-3.5 py-2 text-sm leading-snug"
                  }
                >
                  {m.body}
                </div>
                <span className="tag text-muted text-[10px]">
                  {mine ? "You" : themFirstName} · {fmtTime(m.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <form ref={formRef} action={action} className="mt-1">
        <div className="flex items-end gap-2">
          <input
            name="body"
            autoComplete="off"
            maxLength={2000}
            placeholder="Message…"
            className="flex-1 border border-line bg-paper rounded-lg px-3 py-2.5 text-sm focus:bg-white"
          />
          <input type="hidden" name="matchId" value={matchId} />
          <SubmitButton
            pendingText="…"
            className="bg-ink text-white px-4 py-2.5 rounded-lg font-medium text-sm disabled:opacity-60"
          >
            Send
          </SubmitButton>
        </div>
        {state?.error && <p className="text-xs text-red-600 mt-1.5">{state.error}</p>}
        <p className="text-[11px] text-muted mt-2 px-0.5">
          🔒 Keep it on CUTickets — never wire money or share payment links. Meet on campus.
        </p>
      </form>
    </div>
  );
}
