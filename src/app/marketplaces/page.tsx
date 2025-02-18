import prisma from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Badge } from "@/components/ui/badge";

export default async function MarketplacesPage() {
  const { userId } = await auth();

  const marketplaces = await prisma.marketplace.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      slug: true,
      createdAt: true,
      owners: {
        where: { id: userId || "" },
        select: { id: true },
      },
      members: {
        where: { id: userId || "" },
        select: { id: true },
      },
      _count: {
        select: {
          members: true,
          products: true,
        },
      },
    },
  });

  const serializedMarketplaces = marketplaces.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    role: userId
      ? m.owners.length > 0
        ? "owner"
        : m.members.length > 0
        ? "member"
        : null
      : null,
  }));

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="container mx-auto py-16 px-4">
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-3 text-center text-[#453E3E]">
          Browse Marketplaces
        </h1>
        <p className="text-[#666666] text-center mb-12 max-w-2xl mx-auto">
          Discover unique artisan marketplaces where creators and customers come
          together to build thriving communities.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serializedMarketplaces.map((m) => (
            <Link key={m.id} href={`/marketplace/${m.slug}`} className="block">
              <div className="group h-full bg-white rounded-lg border border-[#E5E5E5] p-6 transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-[#453E3E]">
                    {m.name}
                  </h2>
                  {m.role && (
                    <Badge
                      variant="secondary"
                      className={
                        m.role === "owner"
                          ? "bg-[#FEE4D8] transition-transform transform hover:scale-105 text-[#F97316] font-medium text-xs"
                          : "bg-[#F3F4F6] transition-transform transform hover:scale-105 text-[#6B7280] font-medium text-xs"
                      }
                    >
                      {m.role === "owner" ? "Owner" : "Member"}
                    </Badge>
                  )}
                </div>

                <p className="text-[#666666] mb-6 line-clamp-2 text-sm">
                  {m.description}
                </p>

                <div className="flex items-center gap-2 text-sm text-[#666666]">
                  <span className="inline-flex items-center">
                    {m._count.members}{" "}
                    {m._count.members === 1 ? "member" : "members"}
                  </span>
                  <span className="text-[#E5E5E5]">•</span>
                  <span className="inline-flex items-center">
                    {m._count.products}{" "}
                    {m._count.products === 1 ? "product" : "products"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
