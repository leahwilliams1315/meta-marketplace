import prisma from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import StripeAccountCard from "@/components/StripeAccountCard";
import { ProductSyncBadge } from "@/components/ProductSyncBadge";
import { SyncAllProductsButton } from "@/components/SyncAllProductsButton";
import { stripe } from "@/lib/stripe";
import { Prisma } from "@prisma/client";

type ProductWithPrices = Prisma.ProductGetPayload<{
  include: { 
    prices: true;
    ProductTag: {
      include: {
        tag: true
      }
    }
  };
}>;
import { ImageCarousel } from "@/components/ImageCarousel";
import DeleteProductButton from "@/components/DeleteProductButton";
import { MiniPurchaseRequestCard } from "@/components/MiniPurchaseRequestCard";
import { ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const getPendingRequestsCount = async (userId: string) => {
    return await prisma.purchaseRequest.count({
      where: {
        sellerId: userId,
        status: "PENDING",
      },
    });
  };

  const getRecentRequests = async (userId: string) => {
    return await prisma.purchaseRequest.findMany({
      where: {
        sellerId: userId,
      },
      include: {
        buyer: true,
        product: true,
        price: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 3,
    }).then(requests => requests.map(request => ({
      ...request,
      product: {
        ...request.product,
        images: request.product.images as string[],
      },
    })));
  };

  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  try {
    const [pendingRequestsCount, recentRequests] = await Promise.all([
      getPendingRequestsCount(userId),
      getRecentRequests(userId),
    ]);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        products: {
          include: {
            prices: true,
            ProductTag: {
              include: {
                tag: true
              }
            }
          },
        },
        memberOf: true,
        marketplaces: true,
      },
    });

    if (!user) {
      await prisma.user.create({ data: { id: userId } });
      redirect("/dashboard");
    }

    const userMarketplaces = [...user.memberOf, ...user.marketplaces].filter(
      (m, i, self) => self.findIndex((x) => x.id === m.id) === i
    );
    const { products } = user;

    // Fetch all Stripe products and zip them with local products
    let enhancedProducts: (ProductWithPrices & { isSynced?: boolean })[] = products as ProductWithPrices[];
    if (user.stripeAccountId) {
      const stripeProductsResponse = await stripe.products.list(
        { limit: 100 },
        { stripeAccount: user.stripeAccountId }
      );
      const stripeProducts = stripeProductsResponse.data;
      const stripeMap: Record<string, (typeof stripeProducts)[0]> = {};
      for (const sp of stripeProducts) {
        if (sp.metadata && sp.metadata.localProductId) {
          stripeMap[sp.metadata.localProductId] = sp;
        }
      }
      enhancedProducts = products.map((product) => ({
        ...product,
        isSynced: Boolean(stripeMap[product.id]),
      }));
    }

    return (
      <div className="min-h-screen bg-[#faf9f7] pt-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3 text-[#453E3E]">
              My Dashboard
            </h1>
            <p className="text-[#666666] mb-12">
              Manage your products, view your marketplace memberships, and track
              your Stripe account insights.
            </p>

            {/* Stripe Integration Section */}
            <div className="mb-12 text-center">
              <StripeAccountCard
                initialStripeAccountId={user.stripeAccountId}
              />
            </div>

            {/* Purchase Requests Section */}
            {user.role === "ARTISAN" && (
              <div className="mb-12">
                <h2 className="text-xl font-semibold text-[#453E3E] mb-6 flex items-center gap-3">
                  Purchase Requests
                  {pendingRequestsCount > 0 && (
                    <Badge variant="default" className="bg-[#453E3E]">
                      {pendingRequestsCount} pending
                    </Badge>
                  )}
                </h2>
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-6">
                  <Link
                    href="/dashboard/purchase-requests"
                    className="block text-center py-4 px-6 bg-[#453E3E] text-white rounded-lg hover:bg-[#2A2424] transition-colors"
                  >
                    View Purchase Requests
                  </Link>
                </div>
              </div>
            )}

            {/* Marketplaces Section */}
            <div className="mb-12">
              <h2 className="text-xl font-semibold text-[#453E3E] mb-6">
                My Marketplaces
              </h2>
              {userMarketplaces.length === 0 ? (
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-6">
                  <p className="text-[#666666] mb-4">
                    You haven&apos;t joined any marketplaces yet.
                  </p>
                  <Link
                    href="/marketplaces"
                    className="text-[#F97316] hover:text-[#F97316]/90 font-medium"
                  >
                    Browse Marketplaces
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userMarketplaces.map((m) => (
                    <Link
                      key={m.id}
                      href={`/marketplace/${m.slug}`}
                      className="block"
                    >
                      <div className="group h-full bg-white rounded-lg border border-[#E5E5E5] p-6 transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-semibold text-[#453E3E]">
                            {m.name}
                          </h3>
                          <Badge
                            variant="secondary"
                            className={
                              user.marketplaces.some((um) => um.id === m.id)
                                ? "bg-[#FEE4D8] hover:bg-[#FEE4D8] text-[#F97316] font-medium text-xs"
                                : "bg-[#F3F4F6] hover:bg-[#F3F4F6] text-[#6B7280] font-medium text-xs"
                            }
                          >
                            {user.marketplaces.some((um) => um.id === m.id)
                              ? "Owner"
                              : "Member"}
                          </Badge>
                        </div>
                        <p className="text-[#666666] text-sm line-clamp-2">
                          {m.description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Purchase Requests Section */}
            {user.role === "ARTISAN" && (
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-[#453E3E] flex items-center gap-3">
                    Purchase Requests
                    {pendingRequestsCount > 0 && (
                      <Badge variant="default" className="bg-[#F97316]">
                        {pendingRequestsCount} pending
                      </Badge>
                    )}
                  </h2>
                  <Link 
                    href="/dashboard/purchase-requests"
                    className="text-[#F97316] hover:text-[#EA580C] flex items-center gap-1 text-sm font-medium"
                  >
                    View all
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                
                {recentRequests.length > 0 ? (
                  <div className="grid gap-4">
                    {recentRequests.map((request) => (
                      <MiniPurchaseRequestCard key={request.id} request={request} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No purchase requests yet.
                  </p>
                )}
              </div>
            )}

            {/* Products Section */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-[#453E3E]">
                  My Products
                </h2>
                <Link
                  href="/create-product"
                  className="text-[#F97316] hover:text-[#F97316]/90 font-medium text-sm"
                >
                  + Add Product
                </Link>
              </div>
              {enhancedProducts.length === 0 ? (
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-6">
                  <p className="text-[#666666]">
                    You haven&apos;t created any products yet.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Sync All Button */}
                  <SyncAllProductsButton
                    products={enhancedProducts.map((p) => ({
                      id: p.id,
                      name: p.name,
                      description: p.description,
                      stripeProductId: p.stripeProductId,
                      isSynced: p.isSynced,
                    }))}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {enhancedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="bg-white rounded-lg border border-[#E5E5E5] p-5 flex flex-col gap-3"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-[#453E3E] mb-1.5">
                              {product.name}
                            </h3>
                            <p className="text-[#666666] text-sm line-clamp-2">
                              {product.description}
                            </p>
                          </div>
                          <DeleteProductButton
                            productId={product.id}
                            stripeProductId={product.stripeProductId}
                          />
                        </div>
                        {product.ProductTag && product.ProductTag.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {product.ProductTag.map((pt) => (
                              <Badge
                                key={pt.tag.id}
                                variant="secondary"
                                className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs py-0.5"
                              >
                                {pt.tag.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="relative">
                          <div className="aspect-[4/3] rounded-lg overflow-hidden">
                            <ImageCarousel
                              images={
                                Array.isArray(product.images)
                                  ? (product.images as string[])
                                  : []
                              }
                            />
                          </div>
                          <div className="absolute top-2 right-2 z-10">
                            <ProductSyncBadge
                              productId={product.id}
                              name={product.name}
                              description={product.description}
                              isSynced={!!product.isSynced}
                              images={[]}
                            />
                          </div>
                        </div>
                        <div className="pt-2">
                          <p className="font-bold text-[#453E3E] text-base">
                            ${((product.prices?.[0]?.unitAmount / 100) || 0 / 100).toFixed(2)}
                          </p>
                          <Link
                            href={`/create-product?productId=${product.id}`}
                            className="inline-flex items-center text-[#F97316] text-xs font-medium hover:text-[#F97316]/90 transition-colors"
                          >
                            <svg
                              className="w-3.5 h-3.5 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            Edit
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Dashboard Error:", error);
    return (
      <div className="min-h-screen bg-[#faf9f7] pt-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-6 text-center">
              <p className="text-[#666666]">
                Something went wrong. Please try again later.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
