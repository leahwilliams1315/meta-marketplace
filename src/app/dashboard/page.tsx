import prisma from "@/lib/prisma";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  try {
    // Only include the fields we know exist
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        products: true,
        memberOf: true,
        marketplaces: true,
      },
    });

    if (!user) {
      await prisma.user.create({
        data: { id: userId },
      });
      // Refresh the page to get the new user data
      redirect("/dashboard");
    }

    const userMarketplaces = [...user.memberOf, ...user.marketplaces].filter(
      (m, i, self) => self.findIndex((x) => x.id === m.id) === i
    );

    const { products } = user;

    return (
      <div className="min-h-screen bg-[#faf9f7] pt-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3 text-[#453E3E]">
              My Dashboard
            </h1>
            <p className="text-[#666666] mb-12">
              Manage your products and view your marketplace memberships.
            </p>

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
                    <Link key={m.id} href={`/marketplace/${m.slug}`}>
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

              {products.length === 0 ? (
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-6">
                  <p className="text-[#666666]">
                    You haven&apos;t created any products yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white rounded-lg border border-[#E5E5E5] p-6"
                    >
                      <h3 className="font-medium text-[#453E3E] mb-2">
                        {product.name}
                      </h3>
                      <p className="text-[#666666] text-sm mb-4 line-clamp-2">
                        {product.description}
                      </p>
                      <p className="font-bold text-[#453E3E]">
                        ${(product.price / 100).toFixed(2)}
                      </p>
                    </div>
                  ))}
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
