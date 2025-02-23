import { auth } from "@clerk/nextjs/server";
import { MarketplaceJoinButton } from "@/components/MarketplaceJoinButton";
import { clerkClient } from "@clerk/nextjs/server";
import type { User as ClerkUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import type { PaymentStyle } from '@prisma/client';

type ClerkUserData = {
  name: string;
  imageUrl: string;
};

type RawQueryResult = {
  id: string;
  name: string;
  description: string;
  images: string[];
  stripeProductId: string | null;
  totalQuantity: number;
  sellerId: string;
  price_id: string;
  stripePriceId: string;
  unitAmount: number;
  currency: string;
  isDefault: boolean;
  paymentStyle: PaymentStyle;
  allocatedQuantity: number;
  marketplaceId: string;
  seller_slug: string | null;
  tags: Array<{
    tagId: number;
    tagName: string;
  }> | null;
};

type ProductWithTags = {
  id: string;
  name: string;
  description: string;
  images: string[];
  stripeProductId: string | null;
  totalQuantity: number;
  productTags: Array<{
    tag: {
      id: number;
      name: string;
    };
  }>;
  prices: Array<{
    id: string;
    unitAmount: number;
    currency: string;
    isDefault: boolean;
    paymentStyle: PaymentStyle;
    allocatedQuantity: number;
    marketplaceId: string | null;
  }>;
  seller: {
    id: string;
    slug: string | null;
    name?: string;
    imageUrl?: string;
  };
  currentMarketplaceId?: string;
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

  // First get the marketplace details
  const marketplace = await prisma.marketplace.findUnique({
    where: { slug },
    include: {
      owners: {
        select: {
          id: true,
        }
      },
      members: {
        select: {
          id: true,
        }
      },
    },
  });

  type MarketplaceWithMembers = {
    id: string;
    name: string;
    description: string | null;
    owners: Array<{ id: string }>;
    members: Array<{ id: string }>;
  };

  if (!marketplace) return null;

  const typedMarketplace = marketplace as MarketplaceWithMembers;

  // Then get all products with their prices, tags, and seller info in one efficient query
  const productsWithDetails = await prisma.$queryRaw`
    SELECT DISTINCT ON (p.id)
      p.id,
      p.name,
      p.description,
      p.images,
      p."stripeProductId",
      p."totalQuantity",
      p."sellerId",
      pr.id as price_id,
      pr."stripePriceId",
      pr."unitAmount",
      pr.currency,
      pr."isDefault",
      pr."paymentStyle",
      pr."allocatedQuantity",
      pr."marketplaceId",
      u.slug as seller_slug,
      json_agg(DISTINCT jsonb_build_object(
        'tagId', t.id,
        'tagName', t.name
      )) FILTER (WHERE t.id IS NOT NULL) as tags
    FROM "Product" p
    INNER JOIN "Price" pr ON pr."productId" = p.id
    LEFT JOIN "ProductTag" pt ON pt."productId" = p.id
    LEFT JOIN "Tag" t ON t.id = pt."tagId"
    LEFT JOIN "User" u ON u.id = p."sellerId"
    WHERE pr."marketplaceId" = ${typedMarketplace.id}
    GROUP BY p.id, pr.id, u.slug
    ORDER BY p.id, pr."isDefault" DESC
  `;

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
    ...new Set((productsWithDetails as RawQueryResult[]).map(p => p.sellerId))
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

  const isOwner = typedMarketplace.owners.some((owner) => owner.id === userId);
  const isMember = typedMarketplace.members.some(
    (member) => member.id === userId
  );

  // Get unique products from our raw query results
  const productsMap = new Map<string, ProductWithTags>();
  for (const row of productsWithDetails as RawQueryResult[]) {
    const productId = row.id;
    if (!productsMap.has(productId)) {
      productsMap.set(productId, {
        id: row.id,
        name: row.name,
        description: row.description,
        images: row.images as string[],
        stripeProductId: row.stripeProductId,
        totalQuantity: row.totalQuantity,
        productTags: row.tags && row.tags[0]?.tagId ? row.tags.map(tag => ({
          tag: {
            id: tag.tagId,
            name: tag.tagName
          }
        })) : [],
        prices: [{
          id: row.price_id,
          unitAmount: row.unitAmount,
          currency: row.currency,
          isDefault: row.isDefault,
          paymentStyle: row.paymentStyle,
          allocatedQuantity: row.allocatedQuantity,
          marketplaceId: row.marketplaceId,
        }],
        seller: {
          id: row.sellerId,
          slug: row.seller_slug,
          name: userMap.get(row.sellerId)?.name || "Anonymous",
          imageUrl: userMap.get(row.sellerId)?.imageUrl,
        },
        currentMarketplaceId: marketplace.id
      });
    } else {
      // Add additional prices to existing product
      const product = productsMap.get(productId);
      if (product) {
        product.prices.push({
          id: row.price_id,
          unitAmount: row.unitAmount,
          currency: row.currency,
          isDefault: row.isDefault,
          paymentStyle: row.paymentStyle,
          allocatedQuantity: row.allocatedQuantity,
          marketplaceId: row.marketplaceId,
        });
      }
    }
  }

  const uniqueProducts = Array.from(productsMap.values());

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
