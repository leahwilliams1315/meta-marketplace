import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function MarketplacesPage() {
  // 1. Fetch marketplaces from DB
  const marketplaces = await prisma.marketplace.findMany({
    orderBy: { createdAt: "desc" },
    // You can also take, skip if you want pagination
  });

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Browse Marketplaces</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {marketplaces.map((m) => (
          <div key={m.id} className="border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-2">{m.name}</h2>
            <p className="text-gray-600 mb-4 line-clamp-3">{m.description}</p>
            <Link
              href={`/marketplace/${m.slug}`}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              View Marketplace
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
