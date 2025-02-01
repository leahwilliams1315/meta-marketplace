import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function MarketplacesPage() {
  const marketplaces = await prisma.marketplace.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Browse Marketplaces
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {marketplaces.map((m) => (
          <div key={m.id} className="card hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-2">{m.name}</h2>
            <p className="text-muted-foreground mb-4 line-clamp-3">
              {m.description}
            </p>
            <Link href={`/marketplace/${m.slug}`} className="btn btn-primary">
              View Marketplace
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
