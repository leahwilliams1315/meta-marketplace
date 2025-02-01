import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { CreateProductForm } from "@/components/CreateProductForm";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      products: true,
      memberOf: true,
      marketplaces: true,
    },
  });

  if (!user) {
    return <div className="text-center py-10">User not found</div>;
  }

  const userMarketplaces = [...user.memberOf, ...user.marketplaces].filter(
    (m, i, self) => self.findIndex((x) => x.id === m.id) === i
  );

  const { products } = user;

  return (
    <div className="space-y-8 py-10">
      <h1 className="text-3xl font-bold text-center">My Dashboard</h1>
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Create a New Product</h2>
        <CreateProductForm marketplaces={userMarketplaces} />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">My Products</h2>
        {products.length === 0 ? (
          <p className="text-muted-foreground text-center">
            You have no products yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="card hover:shadow-lg transition-shadow"
              >
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-muted-foreground text-sm line-clamp-2">
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
