import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Public: flyer art carries no identity or trust signal (see the anonymous
// market decision), so it's safe to serve without a session check.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const flyer = await prisma.eventFlyer.findUnique({
    where: { eventId: id },
    select: { data: true, contentType: true },
  });
  if (!flyer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(flyer.data), {
    headers: {
      "Content-Type": flyer.contentType,
      // The URL is versioned with flyerUpdatedAt by callers, so this response
      // never needs revalidation.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
