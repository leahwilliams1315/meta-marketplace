"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCart, formatPrice } from "@/lib/cart";
import { Heart, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface Price {
  id: string;
  unitAmount: number;
  currency: string;
  isDefault: boolean;
  paymentStyle: 'INSTANT' | 'REQUEST';
  allocatedQuantity: number;
  marketplaceId: string | null;
}

interface ProductProps {
  id: string;
  name: string;
  description: string;
  images: string[];
  totalQuantity: number;
  prices: Price[];
  seller: {
    id: string;
    slug: string | null;
    name?: string;
    imageUrl?: string;
  };
  currentMarketplaceId?: string;
}

interface ProductCardProps {
  product: ProductProps;
  productLink?: string;
}

export function ProductCard({ product, productLink }: ProductCardProps) {
  const { dispatch } = useCart();
  const [isFavorite, setIsFavorite] = useState(false);

  // Get the appropriate price for the current marketplace
  const price = React.useMemo(() => {
    // First try to find a marketplace-specific price
    if (product.currentMarketplaceId) {
      const marketplacePrice = product.prices.find(
        (p) => p.marketplaceId === product.currentMarketplaceId
      );
      if (marketplacePrice) return marketplacePrice;
    }
    
    // Fall back to the default price
    return product.prices.find((p) => p.isDefault) || product.prices[0];
  }, [product.prices, product.currentMarketplaceId]);

  const handleAddToCart = async () => {
    if (!price) return;

    // If it's a request-type product, create a purchase request first
    if (price.paymentStyle === 'REQUEST') {
      try {
        const response = await fetch('/api/purchase-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            priceId: price.id,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create purchase request');
        }

        const purchaseRequest = await response.json();

        try {
          dispatch({
            type: "ADD_ITEM",
            payload: {
              id: product.id,
              name: product.name,
              price: price.unitAmount,
              image: product.images && product.images[0] ? product.images[0] : "",
              paymentStyle: price.paymentStyle,
              sellerId: product.seller.id,
              priceId: price.id,
              requestStatus: 'PENDING',
              requestId: purchaseRequest.id,
            },
          });
          toast.success('Purchase request created');
        } catch (error: unknown) {
          toast.error((error as Error).message || 'Cannot mix request and instant purchase items');
        }
      } catch (error) {
        console.error('Error creating purchase request:', error);
        toast.error('Failed to create purchase request');
        return;
      }
    } else {
      // Regular instant purchase
      try {
        dispatch({
          type: "ADD_ITEM",
          payload: {
            id: product.id,
            name: product.name,
            price: price.unitAmount,
            image: product.images && product.images[0] ? product.images[0] : "",
            paymentStyle: price.paymentStyle,
            sellerId: product.seller.id,
            priceId: price.id,
          },
        });
        toast.success('Added to cart');
      } catch (error: unknown) {
        toast.error((error as Error).message || 'Cannot mix request and instant purchase items');
      }
    }
  };

  const toggleFavorite = () => {
    setIsFavorite((prev) => !prev);
  };

  // Don't render if no price is available
  if (!price) return null;

  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      {product.images && product.images[0] && (
        <div className="aspect-video mb-4 rounded-lg overflow-hidden relative">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
      <Link href={productLink || `/user/${product.seller.slug || product.seller.id}/product/${product.id}`}>
        <h3 className="font-semibold mb-2 text-[#453E3E]">{product.name}</h3>
      </Link>
      <p className="text-muted-foreground text-sm mb-4">
        {product.description}
      </p>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-lg font-bold">{formatPrice(price.unitAmount)}</span>
          {price.paymentStyle === 'REQUEST' && (
            <span className="text-xs text-muted-foreground">Requires approval</span>
          )}
          {price.allocatedQuantity > 0 && (
            <span className="text-xs text-muted-foreground">
              {price.allocatedQuantity} available
            </span>
          )}
        </div>
        <Link
          href={`/user/${product.seller.slug || ''}`}
          className="flex items-center gap-2 text-sm text-[#666666] hover:text-[#453E3E] transition-colors"
        >
          <div className="relative w-6 h-6 rounded-full overflow-hidden bg-[#453E3E] flex items-center justify-center text-white">
            {product.seller.imageUrl ? (
              <Image
                src={product.seller.imageUrl}
                alt={product.seller.name || ""}
                fill
                className="object-cover"
              />
            ) : (
              <span className="text-xs">
                {(product.seller.name || "A")[0].toUpperCase()}
              </span>
            )}
          </div>
          <span>by {product.seller.name || "Anonymous"}</span>
        </Link>
      </div>
      <div className="flex gap-4 mt-4">
        <Button
          variant="default"
          onClick={handleAddToCart}
          disabled={price.allocatedQuantity === 0}
          className="flex-1 flex items-center justify-center gap-2 bg-[#453E3E] hover:bg-[#2A2424] text-white disabled:bg-gray-300"
        >
          <ShoppingCart className="h-4 w-4" />
          {price.paymentStyle === 'REQUEST' ? 'Request to Buy' : 'Add to Cart'}
        </Button>
        <Button
          variant="ghost"
          onClick={toggleFavorite}
          className={`flex-1 flex items-center justify-center gap-2 ${
            isFavorite ? "text-red-500" : "text-[#666666]"
          }`}
        >
          <Heart className="h-4 w-4" />
          Favorite
        </Button>
      </div>
    </div>
  );
}
