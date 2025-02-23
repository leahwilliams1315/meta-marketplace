import React from 'react';
import ProductDetail from '@/components/ProductDetail';
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { MessageCircle, Heart, Share2, ShoppingBag, Star, Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';
import { Avatar } from '@/components/ui/avatar';
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { PaymentStyle } from '@prisma/client';

interface PageProps {
  params: Promise<{
    slug: string;
    productId: string;
  }>;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const socialFeatures = (product: any) => [
  {
    Icon: ShoppingBag,
    name: "Product Showcase",
    description: product.description,
    href: `/user/${product.seller.slug}`,
    cta: "View Creator Profile",
    background: product.images[0] ? (
      <div className="absolute inset-0 opacity-10">
        <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
      </div>
    ) : <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-50" />,
    className: "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3",
    content: (
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Avatar>
            <Image src={product.seller.imageUrl || ''} alt={product.seller.name || ''} width={40} height={40} />
          </Avatar>
          <div>
            <p className="font-semibold">{product.seller.name}</p>
            <p className="text-sm text-[#666666]">Original Creator</p>
          </div>
        </div>
        <div className="flex gap-2 text-sm text-[#666666]">
          <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> 124</span>
          <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> 45</span>
          <span className="flex items-center gap-1"><Share2 className="w-4 h-4" /> 12</span>
        </div>
      </div>
    )
  },
  {
    Icon: Star,
    name: "Featured Review",
    description: "This piece is absolutely stunning! The craftsmanship is impeccable, and it's even more beautiful in person.",
    href: "#reviews",
    cta: "Read All Reviews",
    background: <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-transparent opacity-50" />,
    className: "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-2",
    content: (
      <div className="mt-4">
        <div className="flex items-center gap-2">
          <Avatar>
            <Image src="https://i.pravatar.cc/100?u=1" alt="Sarah M." width={32} height={32} />
          </Avatar>
          <div>
            <p className="font-semibold">Sarah M.</p>
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    Icon: MessageCircle,
    name: "Recent Comments",
    description: "Join the conversation about this unique piece",
    href: "#comments",
    cta: "View All Comments",
    background: <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-50" />,
    className: "lg:col-start-2 lg:col-end-3 lg:row-start-2 lg:row-end-4",
    content: (
      <div className="space-y-4 mt-4">
        {[
          { name: "Alex K.", avatar: "https://i.pravatar.cc/100?u=2", comment: "Love the attention to detail!" },
          { name: "Maria R.", avatar: "https://i.pravatar.cc/100?u=3", comment: "Would this work well with..." },
          { name: "James L.", avatar: "https://i.pravatar.cc/100?u=4", comment: "Just ordered one!" }
        ].map((comment, i) => (
          <div key={i} className="flex items-start gap-2">
            <Avatar>
              <Image src={comment.avatar} alt={comment.name} width={24} height={24} />
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{comment.name}</p>
              <p className="text-sm text-[#666666]">{comment.comment}</p>
            </div>
          </div>
        ))}
      </div>
    )
  },
  {
    Icon: LinkIcon,
    name: "Related Links",
    description: "Discover more from this creator",
    href: `/user/${product.seller.slug}/collection`,
    cta: "View Collection",
    background: <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-50" />,
    className: "lg:col-start-3 lg:col-end-3 lg:row-start-1 lg:row-end-4",
    content: (
      <div className="space-y-4 mt-4">
        <div className="p-3 bg-[#faf9f7] rounded-lg">
          <p className="font-semibold">Creator&apos;s Collection</p>
          <p className="text-sm text-[#666666]">View all pieces by {product.seller.name}</p>
        </div>
        <div className="p-3 bg-[#faf9f7] rounded-lg">
          <p className="font-semibold">Similar Items</p>
          <p className="text-sm text-[#666666]">More from this marketplace</p>
        </div>
        <div className="p-3 bg-[#faf9f7] rounded-lg">
          <p className="font-semibold">Creation Process</p>
          <p className="text-sm text-[#666666]">Behind the scenes</p>
        </div>
      </div>
    )
  }
];

const MarketplaceProductPage = async ({ params }: PageProps) => {
  const { userId } = await auth();
  const { productId, slug } = await params;
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
                The product you&apos;re looking for doesn&apos;t exist or has been removed.
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
          
          <div className="bg-white rounded-lg border border-[#E5E5E5] p-6 mb-8">
            <ProductDetail product={product} marketplaceSlug={slug} />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 text-[#453E3E]">Community & Discussion</h2>
            <BentoGrid className="lg:grid-rows-3">
              {socialFeatures(product).map((feature) => (
                <BentoCard key={feature.name} {...feature} />
              ))}
            </BentoGrid>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceProductPage;
