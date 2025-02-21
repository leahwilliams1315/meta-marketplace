import React from 'react';
import ProductDetail, { Product } from '@/components/ProductDetail';
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { PaymentStyle } from '@prisma/client';

interface PageProps {
  params: {
    slug: string;
    productId: string;
  };
}

async function fetchProduct(productId: string, marketplaceSlug: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      seller: true,
      prices: {
        where: {
          marketplace: {
            slug: marketplaceSlug
          }
        }
      }
    }
  });

  if (!product) {
    return null;
  }

  // Fetch seller's Clerk user data
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(product.seller.id);
  
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    images: product.images as string[],
    prices: product.prices.map(price => ({
      id: price.id,
      unitAmount: price.unitAmount,
      currency: price.currency,
      isDefault: price.isDefault,
      paymentStyle: price.paymentStyle as PaymentStyle,
      allocatedQuantity: price.allocatedQuantity
    })),
    seller: {
      id: product.seller.id,
      slug: product.seller.slug,
      name: `${clerkUser.firstName} ${clerkUser.lastName}`.trim() || "Anonymous",
      imageUrl: clerkUser.imageUrl
    }
  };
}

const MarketplaceProductPage = async ({ params: { slug, productId } }: PageProps) => {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const product = await fetchProduct(productId, slug);
  
  if (!product) {
    return (
      <div className="min-h-screen bg-[#faf9f7] pt-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-8 text-center">
              <h1 className="text-2xl font-bold text-destructive mb-2">
                Product not found
              </h1>
              <p className="text-[#666666]">
                The product you're looking for doesn't exist or has been removed.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const marketplace = await prisma.marketplace.findUnique({
    where: { slug }
  });

  return (
    <div className="min-h-screen bg-[#faf9f7] pt-24">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3 text-[#453E3E]">
              {product.name}
            </h1>
            <p className="text-[#666666]">
              Available in the {marketplace?.name || 'marketplace'}
            </p>
          </div>
          
          <div className="bg-white rounded-lg border border-[#E5E5E5] p-6">
            <ProductDetail product={product} marketplaceSlug={slug} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceProductPage;
