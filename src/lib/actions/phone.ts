"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { adminAuth } from "@/lib/firebase/admin";

export type VerifyPhoneResult = { ok: true } | { ok: false; error: string };

/**
 * Confirms a Firebase phone-OTP verification server-side. The client completes
 * the OTP exchange with Firebase and sends us the resulting ID token; we verify
 * that token with the Admin SDK (so a client can't forge a "verified" phone) and
 * persist the number against the signed-in user.
 */
export async function verifyPhoneToken(idToken: string): Promise<VerifyPhoneResult> {
  const user = await requireUser();

  if (!idToken || typeof idToken !== "string") {
    return { ok: false, error: "Missing verification token." };
  }

  let phone: string | undefined;
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    phone = decoded.phone_number;
  } catch {
    return { ok: false, error: "Could not verify that code. Please try again." };
  }

  if (!phone) {
    return { ok: false, error: "No phone number was attached to the verification." };
  }

  // One phone number per account.
  const taken = await prisma.user.findFirst({
    where: { phone, NOT: { id: user.id } },
    select: { id: true },
  });
  if (taken) {
    return { ok: false, error: "That phone number is already linked to another account." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { phone, phoneVerifiedAt: new Date() },
  });

  return { ok: true };
}
