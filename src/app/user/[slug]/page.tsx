import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { clerkClient } from "@clerk/nextjs/server";
import Image from "next/image";

export default async function UserPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // First, find the user by their slug
  const user = await prisma.user.findUnique({
    where: { slug },
  });

  if (!user) {
    notFound();
  }

  const clerk = await clerkClient();

  // Get the user's Clerk profile data
  const clerkUser = await clerk.users.getUser(user.id);

  // Get all products by this user
  const products = await prisma.product.findMany({
    where: { sellerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      prices: true,
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          {clerkUser.imageUrl && (
            <Image
              src={clerkUser.imageUrl}
              alt={clerkUser.firstName || "User"}
              width={64}
              height={64}
              className="rounded-full object-cover"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {clerkUser.firstName
                ? `${clerkUser.firstName}${
                    clerkUser.lastName ? ` ${clerkUser.lastName}` : ""
                  }'s Store`
                : "Store"}
            </h1>
            {/* Add any other user details you want to display */}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={{
              ...product,
              images: product.images as string[],
              prices: product.prices,
              seller: {
                id: user.id,
                slug: user.slug as string,
                name: clerkUser.firstName
                  ? `${clerkUser.firstName}${
                      clerkUser.lastName ? ` ${clerkUser.lastName}` : ""
                    }`
                  : undefined,
                imageUrl: clerkUser.imageUrl,
              },
            }}
          />
        ))}
      </div>

      {products.length === 0 && (
        <p className="text-center text-gray-500 mt-8">
          This user hasn&apos;t listed any products yet.
        </p>
      )}
    </div>
  );
}
