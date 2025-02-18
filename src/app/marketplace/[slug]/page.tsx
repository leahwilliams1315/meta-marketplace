import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import type { User as ClerkUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import type { Marketplace, Product, User } from "@prisma/client";

type ProductWithSeller = Product & {
  seller: User;
  images: string[];
};

type MarketplaceWithRelations = Marketplace & {
  products: ProductWithSeller[];
  owners: User[];
  members: User[];
};

type ClerkUserData = {
  name: string;
  imageUrl: string;
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

  // Fetch Clerk user information for all sellers
  const sellerIds = [
    ...new Set(marketplace.products.map((product) => product.sellerId)),
  ];
  const clerk = await clerkClient();
  const clerkUsers = await Promise.all(
    sellerIds.map((id) => clerk.users.getUser(id))
  );

  // Create a map of Clerk user data
  const userMap = new Map<string, ClerkUserData>(
    clerkUsers.map((user: ClerkUser) => [
      user.id,
      {
        name: `${user.firstName} ${user.lastName}`.trim() || "Anonymous",
        imageUrl: user.imageUrl,
      },
    ])
  );

  const typedMarketplace = marketplace as MarketplaceWithRelations;
  const isOwner = typedMarketplace.owners.some((owner) => owner.id === userId);
  const isMember = typedMarketplace.members.some(
    (member) => member.id === userId
  );

  // Enhance products with Clerk user data
  const enhancedProducts = typedMarketplace.products.map((product) => {
    const clerkUserData = userMap.get(product.sellerId);
    return {
      ...product,
      seller: {
        ...product.seller,
        name: clerkUserData?.name || "Anonymous",
        imageUrl: clerkUserData?.imageUrl,
      },
    };
  });

  return (
    <div className="py-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{typedMarketplace.name}</h1>
        <p className="text-muted-foreground">{typedMarketplace.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {enhancedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
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
