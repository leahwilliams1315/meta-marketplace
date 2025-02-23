"use client";

import React from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { ImageCarousel } from "@/components/ImageCarousel";
import { Heart, ShoppingCart } from "lucide-react";
import { useCart, formatPrice } from "@/lib/cart";
import { toast } from "sonner";

// Define types for price and product
export type Price = {
  id: string;
  unitAmount: number;
  currency: string;
  isDefault: boolean;
  paymentStyle: 'INSTANT' | 'REQUEST';
  allocatedQuantity: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  images: string[];
  prices: Price[];
  seller: {
    id: string;
    slug: string | null;
    name?: string;
    imageUrl?: string;
  };
};

interface ProductDetailProps {
  product: Product;
  marketplaceSlug?: string;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product }) => {
  const { dispatch } = useCart();
  const [isFavorite, setIsFavorite] = React.useState(false);

  // Get the appropriate price
  const price = React.useMemo(() => {
    return product.prices.find((p) => p.isDefault) || product.prices[0];
  }, [product.prices]);

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

  if (!price) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="relative">
        {product.images && product.images.length > 0 ? (
          <ImageCarousel images={product.images} />
        ) : (
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-gray-400">No Image Available</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#453E3E] flex items-center justify-center text-white">
              {product.seller.imageUrl ? (
                <Image
                  src={product.seller.imageUrl}
                  alt={product.seller.name || ""}
                  fill
                  className="object-cover"
                />
              ) : (
                <span className="text-sm">
                  {(product.seller.name || "A")[0].toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-[#666666]">
              by {product.seller.name || "Anonymous"}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-[#666666] whitespace-pre-wrap">{product.description}</p>

          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#453E3E]">
                {price.paymentStyle === 'REQUEST' ? 'Request Price' : formatPrice(price.unitAmount)}
              </span>
              {price.allocatedQuantity > 0 && (
                <span className="text-sm text-[#666666]">
                  {price.allocatedQuantity} available
                </span>
              )}
            </div>
            {price.paymentStyle === 'REQUEST' && (
              <p className="text-sm text-[#666666]">
                This item requires seller approval before purchase
              </p>
            )}
          </div>

          <div className="flex gap-4 pt-4">
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
              className={`flex items-center justify-center gap-2 ${isFavorite ? "text-red-500" : "text-[#666666]"}`}
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
