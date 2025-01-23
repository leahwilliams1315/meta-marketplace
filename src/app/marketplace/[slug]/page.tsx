import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import type { Marketplace, Product, User } from "@prisma/client";

type ProductWithSeller = Product & {
  seller: User;
};

type MarketplaceWithRelations = Marketplace & {
  products: ProductWithSeller[];
  owners: User[];
  members: User[];
};

export default async function MarketplacePage({
  params: { slug },
}: {
  params: { slug: string };
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const marketplace = await prisma.marketplace.findUnique({
    where: { slug },
    include: {
      products: {
        include: {
          seller: true,
        },
      },
      owners: true,
      members: true,
    },
  });

  if (!marketplace) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)] py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="card text-center">
            <h1 className="text-2xl font-bold text-red-500">
              Marketplace not found
            </h1>
          </div>
        </div>
      </div>
    );
  }

  const typedMarketplace = marketplace as MarketplaceWithRelations;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--background)] to-[var(--muted)]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="card mb-8">
          <h1 className="text-3xl font-bold mb-2">{typedMarketplace.name}</h1>
          <p className="text-[var(--muted-foreground)]">
            {typedMarketplace.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {typedMarketplace.products.map((product) => (
            <div
              key={product.id}
              className="card hover:shadow-md transition-shadow"
            >
              {product.images[0] && (
                <div className="aspect-video mb-4 rounded-lg overflow-hidden">
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <h3 className="font-semibold mb-2">{product.name}</h3>
              <p className="text-[var(--muted-foreground)] text-sm mb-4">
                {product.description}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-[var(--foreground)]">
                  ${(product.price / 100).toFixed(2)}
                </span>
                <span className="text-sm text-[var(--muted-foreground)]">
                  by {product.seller.id}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="card mt-8">
          <h2 className="text-xl font-semibold mb-4">Members</h2>
          <div className="flex flex-wrap gap-2">
            {typedMarketplace.members.map((member) => (
              <div
                key={member.id}
                className="bg-[var(--muted)] text-[var(--muted-foreground)] px-3 py-1 rounded-full text-sm"
              >
                {member.id}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
