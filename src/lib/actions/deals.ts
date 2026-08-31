"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { notify, notifyEventWatchersIfAvailable } from "@/lib/notifications";
import { firstName } from "@/lib/format";
import { dealParty, releaseDeal } from "@/lib/deals";
import type { ActionState } from "./types";

export type { ActionState };

export async function cancelDeal(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") ?? "");
  if (!dealId) return { error: "Missing deal" };

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      listingId: true,
      eventId: true,
      buyerId: true,
      sellerId: true,
      quantity: true,
      status: true,
      event: { select: { name: true } },
    },
  });
  if (!deal) return { error: "Deal not found" };
  const { authorized, otherId } = dealParty(deal, user.id);
  if (!authorized) return { error: "Not authorized" };
  if (deal.status !== "RESERVED") return { error: "This deal can’t be cancelled" };

  await prisma.$transaction(async (tx) => {
    const released = await releaseDeal(tx, deal, "CANCELLED");
    if (!released) return;
    await notify(
      {
        userId: otherId,
        type: "DEAL_CANCELLED",
        dealId: deal.id,
        body: `${firstName(user)} cancelled the ${deal.event.name} reservation`,
      },
      tx,
    );
    await notifyEventWatchersIfAvailable(deal.eventId, deal.event.name, tx);
  });

  revalidatePath("/deals");
  revalidatePath(`/deals/${deal.id}`);
  revalidatePath(`/events/${deal.eventId}`);
  redirect("/deals");
}

export async function confirmSale(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") ?? "");
  if (!dealId) return { error: "Missing deal" };

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      eventId: true,
      buyerId: true,
      sellerId: true,
      status: true,
      event: { select: { name: true } },
    },
  });
  if (!deal) return { error: "Deal not found" };
  const { isBuyer, authorized, otherId } = dealParty(deal, user.id);
  if (!authorized) return { error: "Not authorized" };
  if (deal.status !== "RESERVED") return { error: "This deal is no longer active" };

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.deal.findUnique({
      where: { id: deal.id },
      select: { status: true, buyerConfirmed: true, sellerConfirmed: true },
    });
    if (!fresh || fresh.status !== "RESERVED") return;

    const changed = isBuyer ? !fresh.buyerConfirmed : !fresh.sellerConfirmed;
    if (!changed) return;

    // Each party writes only its own flag. This prevents simultaneous buyer and
    // seller confirmations from overwriting one another.
    const written = await tx.deal.updateMany({
      where: { id: deal.id, status: "RESERVED" },
      data: isBuyer ? { buyerConfirmed: true } : { sellerConfirmed: true },
    });
    if (!written.count) return;
    const confirmed = await tx.deal.findUnique({
      where: { id: deal.id },
      select: { status: true, buyerConfirmed: true, sellerConfirmed: true },
    });
    const completed = confirmed?.status === "RESERVED" && confirmed.buyerConfirmed && confirmed.sellerConfirmed;
    if (completed) {
      await tx.deal.updateMany({
        where: { id: deal.id, status: "RESERVED" },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }
    await tx.message.create({
      data: {
        dealId: deal.id,
        senderId: user.id,
        kind: "EVENT",
        body: completed ? "Sale complete." : `${firstName(user)} marked the sale complete.`,
      },
    });

    if (completed) {
      for (const userId of [deal.buyerId, deal.sellerId]) {
        await notify(
          {
            userId,
            type: "TRADE_COMPLETED",
            dealId: deal.id,
            body: `Your ${deal.event.name} sale is complete`,
          },
          tx,
        );
      }
    } else {
      await notify(
        {
          userId: otherId,
          type: "TRADE_CONFIRMED",
          dealId: deal.id,
          body: `${firstName(user)} marked the ${deal.event.name} sale complete`,
        },
        tx,
      );
    }
  });

  revalidatePath("/deals");
  revalidatePath(`/deals/${deal.id}`);
  revalidatePath(`/events/${deal.eventId}`);
  return { ok: true };
}

export async function sendMessage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") ?? "");
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!dealId) return { error: "Missing deal" };
  if (!body) return { error: "Write a message first" };

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { id: true, buyerId: true, sellerId: true, status: true },
  });
  if (!deal) return { error: "Deal not found" };
  const { authorized, otherId } = dealParty(deal, user.id);
  if (!authorized) return { error: "Not authorized" };
  if (deal.status !== "RESERVED" && deal.status !== "COMPLETED") {
    return { error: "This chat is closed" };
  }

  await prisma.message.create({ data: { dealId: deal.id, senderId: user.id, body } });
  await notify({
    userId: otherId,
    type: "NEW_MESSAGE",
    dealId: deal.id,
    body: `New message from ${firstName(user)}`,
    collapse: true,
  });
  revalidatePath(`/deals/${deal.id}`);
  return { ok: true };
}

const rateSchema = z.object({
  dealId: z.string().min(1),
  stars: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(300).optional(),
});

export async function rateSale(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = rateSchema.safeParse({
    dealId: formData.get("dealId"),
    stars: formData.get("stars"),
    comment: formData.get("comment") || undefined,
  });
  if (!parsed.success) return { error: "Invalid rating" };

  const deal = await prisma.deal.findUnique({
    where: { id: parsed.data.dealId },
    select: { id: true, buyerId: true, sellerId: true, status: true },
  });
  if (!deal) return { error: "Deal not found" };
  if (deal.status !== "COMPLETED") return { error: "Complete the sale before rating" };
  const { authorized, otherId: subjectId } = dealParty(deal, user.id);
  if (!authorized) return { error: "Not authorized" };

  await prisma.rating.upsert({
    where: { dealId_authorId: { dealId: deal.id, authorId: user.id } },
    update: { stars: parsed.data.stars, comment: parsed.data.comment ?? null },
    create: {
      dealId: deal.id,
      authorId: user.id,
      subjectId,
      stars: parsed.data.stars,
      comment: parsed.data.comment ?? null,
    },
  });
  revalidatePath(`/deals/${deal.id}`);
  revalidatePath(`/profile/${subjectId}`);
  return { ok: true };
}
