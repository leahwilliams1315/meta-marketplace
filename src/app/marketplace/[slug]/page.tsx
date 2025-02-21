import { auth } from "@clerk/nextjs/server";
import { MarketplaceJoinButton } from "@/components/MarketplaceJoinButton";
import { clerkClient } from "@clerk/nextjs/server";
import type { User as ClerkUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import type { Marketplace, Product, User } from "@prisma/client";

import { PaymentStyle } from '@prisma/client';

interface ProductProps {
  id: string;
  name: string;
  description: string;
  images: string[];
  stripeProductId: string | null;
  totalQuantity: number;
  seller: {
    id: string;
    slug: string | null;
    name?: string;
    imageUrl?: string;
  };
  prices: Array<{
    id: string;
    unitAmount: number;
    currency: string;
    isDefault: boolean;
    paymentStyle: PaymentStyle;
    allocatedQuantity: number;
    marketplaceId: string | null;
  }>;
  currentMarketplaceId?: string;
}

type DbPrice = {
  id: string;
  stripePriceId: string;
  unitAmount: number;
  currency: string;
  isDefault: boolean;
  paymentStyle: PaymentStyle;
  allocatedQuantity: number;
  marketplaceId: string | null;
  product: Product & {
    seller: User;
    prices: Array<{
      id: string;
      stripePriceId: string;
      unitAmount: number;
      currency: string;
      isDefault: boolean;
      paymentStyle: PaymentStyle;
      allocatedQuantity: number;
      marketplaceId: string | null;
    }>;
  };
};

type MarketplaceWithRelations = Marketplace & {
  prices: DbPrice[];
  owners: User[];
  members: User[];
};

type ClerkUserData = {
  name: string;
  imageUrl: string;
};

export default async function MarketplacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const marketplace = await prisma.marketplace.findUnique({
    where: { slug },
    include: {
      prices: {
        include: {
          product: {
            include: {
              seller: true,
              prices: true,
            }
          }
        }
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
    ...new Set(marketplace.prices.map((price) => price.product.sellerId)),
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

  // Get unique products and enhance them with Clerk user data
  const uniqueProducts: ProductProps[] = Array.from(
    new Map(
      typedMarketplace.prices.map(price => [
        price.product.id,
        {
          id: price.product.id,
          name: price.product.name,
          description: price.product.description,
          images: price.product.images as string[],
          stripeProductId: price.product.stripeProductId,
          totalQuantity: price.product.totalQuantity,
          prices: typedMarketplace.prices
            .filter(p => p.product.id === price.product.id)
            .map(p => ({
              id: p.id,
              unitAmount: p.unitAmount,
              currency: p.currency,
              isDefault: p.isDefault,
              paymentStyle: p.paymentStyle,
              allocatedQuantity: p.allocatedQuantity,
              marketplaceId: p.marketplaceId,
            })),
          seller: {
            id: price.product.seller.id,
            slug: price.product.seller.slug,
            name: userMap.get(price.product.seller.id)?.name || "Anonymous",
            imageUrl: userMap.get(price.product.seller.id)?.imageUrl,
          },
          currentMarketplaceId: typedMarketplace.id
        }
      ])
    ).values()
  );

  return (
    <div className="py-24">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">{typedMarketplace.name}</h1>
          {!isOwner && (
            <div className="flex items-center gap-4">
              <MarketplaceJoinButton
                marketplaceId={typedMarketplace.id}
                initialIsMember={isMember}
                disabled={isOwner}
              />
            </div>
          )}
        </div>
        <p className="text-muted-foreground">{typedMarketplace.description}</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {typedMarketplace.members.length} member{typedMarketplace.members.length !== 1 ? 's' : ''}
          </div>
          <div className="text-sm text-muted-foreground">
            {uniqueProducts.length} product{uniqueProducts.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {uniqueProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={{
              ...product,
              currentMarketplaceId: typedMarketplace.id
            }}
            productLink={`/marketplace/${slug}/product/${product.id}`}
          />
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
