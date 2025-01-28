import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { CreateProductForm } from "@/components/CreateProductForm";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // 1) Get user from DB, including any marketplaces they own or are a member of
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      products: true,
      memberOf: true, // Marketplaces the user has joined
      marketplaces: true, // Marketplaces the user owns
    },
  });

  if (!user) {
    // Should not happen if they're logged in, but just in case
    return <div>User not found</div>;
  }

  // 2) A combined list of all marketplaces the user can post in (owner or member)
  const userMarketplaces = [...user.memberOf, ...user.marketplaces].filter(
    (m, i, self) => self.findIndex((x) => x.id === m.id) === i
  );

  // 3) The user's products
  const { products } = user;

  return (
    <div className="container py-10 space-y-8">
      <h1 className="text-3xl font-bold">My Dashboard</h1>

      {/* Create Product Form */}
      <div className="p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Create a New Product</h2>
        <CreateProductForm marketplaces={userMarketplaces} />
      </div>

      {/* My Products */}
      <div>
        <h2 className="text-xl font-semibold mb-4">My Products</h2>
        {products.length === 0 ? (
          <p className="text-gray-600">You have no products yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="border rounded p-4 shadow-sm">
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {product.description}
                </p>
                <p className="font-bold mt-2">
                  ${(product.price / 100).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
