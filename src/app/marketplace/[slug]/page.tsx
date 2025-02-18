import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import type { Marketplace, Product, User } from "@prisma/client";
import Image from "next/image";

type ProductWithSeller = Product & {
  seller: User;
  images: string[];
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center">
          <h1 className="text-2xl font-bold text-destructive">
            Marketplace not found
          </h1>
        </div>
      </div>
    );
  }

  const typedMarketplace = marketplace as MarketplaceWithRelations;
  const isOwner = typedMarketplace.owners.some((owner) => owner.id === userId);
  const isMember = typedMarketplace.members.some(
    (member) => member.id === userId
  );

  return (
    <div className="py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{typedMarketplace.name}</h1>
        <p className="text-muted-foreground">{typedMarketplace.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {typedMarketplace.products.map((product) => (
          <div
            key={product.id}
            className="card hover:shadow-md transition-shadow"
          >
            {Array.isArray(product.images) && product.images[0] && (
              <div className="aspect-video mb-4 rounded-lg overflow-hidden relative">
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            )}
            <h3 className="font-semibold mb-2">{product.name}</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {product.description}
            </p>
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">
                ${(product.price / 100).toFixed(2)}
              </span>
              <span className="text-sm text-muted-foreground">
                by {product.seller.id}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-white rounded-lg border border-[#E5E5E5] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#453E3E]">
            Marketplace Team
          </h2>
          {(isOwner || isMember) && (
            <span className="px-3 py-1 rounded-full bg-[#FEE4D8] text-[#F97316] text-sm font-medium">
              {isOwner ? "Owner" : "Member"}
            </span>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-[#666666] mb-3">Owners</h3>
            <div className="flex flex-wrap gap-3">
              {typedMarketplace.owners.map((owner) => (
                <div
                  key={owner.id}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                >
                  <div className="w-8 h-8 bg-[#453E3E] rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {owner.id.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#453E3E]">
                      {owner.id.split("_")[1] || "User"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {typedMarketplace.members.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[#666666] mb-3">
                Members
              </h3>
              <div className="flex flex-wrap gap-3">
                {typedMarketplace.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-[#666666] rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {member.id.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#453E3E]">
                        {member.id.split("_")[1] || "User"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
