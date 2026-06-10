"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { SCHOOLS } from "@/lib/constants";

export type ActionState = { error?: string } | undefined;

const currentYear = new Date().getFullYear();

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  school: z.enum(SCHOOLS),
  classYear: z.coerce
    .number()
    .int()
    .min(currentYear - 8, "Enter a valid class year")
    .max(currentYear + 8, "Enter a valid class year"),
});

export async function completeOnboarding(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = schema.safeParse({
    name: formData.get("name"),
    school: formData.get("school"),
    classYear: formData.get("classYear"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      school: parsed.data.school,
      classYear: parsed.data.classYear,
    },
  });

  redirect("/events");
}
