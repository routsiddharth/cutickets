import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import AdsClient from "./AdsClient";

export default async function AdminAdsPage() {
  const user = await requireUser();

  if (!isAdmin(user)) {
    return (
      <main className="max-w-5xl mx-auto px-5 sm:px-7 py-8">
        <p className="text-sm text-muted">Admin access required.</p>
      </main>
    );
  }

  const ads = await prisma.ad.findMany({
    orderBy: { createdAt: "desc" },
  });

  const adRows = ads.map((a) => ({ ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() }));

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-7 py-8">
      <h1 className="font-serif text-3xl mb-7">Ad Management</h1>
      <AdsClient ads={adRows} />
    </main>
  );
}
