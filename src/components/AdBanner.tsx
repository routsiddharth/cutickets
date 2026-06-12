import { prisma } from "@/lib/prisma";
import Image from "next/image";

export default async function AdBanner({ placement }: { placement: string }) {
  const ads = await prisma.ad.findMany({
    where: { placement, active: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  if (ads.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {ads.map((ad) => {
        const inner = (
          <div className="bg-white border border-line rounded-xl px-4 py-3 flex gap-4 items-center">
            {ad.imageUrl && (
              <div className="shrink-0 w-12 h-12 relative rounded-lg overflow-hidden border border-line">
                <Image src={ad.imageUrl} alt="" fill className="object-cover" unoptimized />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{ad.title}</p>
              {ad.body && <p className="text-xs text-muted mt-0.5 line-clamp-2">{ad.body}</p>}
            </div>
            <span className="text-[10px] text-muted shrink-0">Ad</span>
          </div>
        );

        return ad.linkUrl ? (
          <a
            key={ad.id}
            href={ad.linkUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block hover:opacity-90 transition-opacity"
          >
            {inner}
          </a>
        ) : (
          <div key={ad.id}>{inner}</div>
        );
      })}
    </div>
  );
}
