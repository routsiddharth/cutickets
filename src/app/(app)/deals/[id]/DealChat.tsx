"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sendMessage, type ActionState } from "@/lib/actions/deals";
import SubmitButton from "@/components/SubmitButton";

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  kind: "TEXT" | "EVENT";
  createdAt: string;
};

export default function DealChat({ dealId, meId, messages }: { dealId: string; meId: string; messages: ChatMessage[] }) {
  const router = useRouter();
  const [state, action] = useActionState<ActionState, FormData>(sendMessage, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [router]);
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages.length]);

  return (
    <div className="border border-line rounded-xl bg-white overflow-hidden">
      <div ref={threadRef} className="h-[340px] overflow-y-auto px-4 py-5 space-y-3">
        {messages.map((message) => {
          if (message.kind === "EVENT") {
            return <p key={message.id} className="text-center text-xs text-muted py-1">{message.body}</p>;
          }
          const mine = message.senderId === meId;
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-xl px-3.5 py-2 text-sm leading-relaxed ${mine ? "bg-ink text-white rounded-br-sm" : "bg-paper border border-line rounded-bl-sm"}`}>
                {message.body}
              </div>
            </div>
          );
        })}
      </div>
      <form ref={formRef} action={action} className="border-t border-line p-3">
        <div className="flex gap-2">
          <input type="hidden" name="dealId" value={dealId} />
          <input name="body" autoComplete="off" maxLength={2000} required placeholder="Write a message" className="flex-1 min-w-0 border border-line bg-paper rounded-lg px-3 py-2.5 text-sm focus:bg-white" />
          <SubmitButton pendingText="Sending…" className="bg-ink text-white rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-60">Send</SubmitButton>
        </div>
        {state?.error && <p className="text-xs text-red-600 mt-2" role="alert">{state.error}</p>}
      </form>
    </div>
  );
}
