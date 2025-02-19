"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCart, formatPrice } from "@/lib/cart";
import { Heart, ShoppingCart } from "lucide-react";

interface ProductProps {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  seller: {
    id: string;
    slug: string;
    name?: string;
    imageUrl?: string;
  };
}

interface ProductCardProps {
  product: ProductProps;
}

export function ProductCard({ product }: ProductCardProps) {
  const { dispatch } = useCart();
  const [isFavorite, setIsFavorite] = useState(false);

  const handleAddToCart = () => {
    dispatch({
      type: "ADD_ITEM",
      payload: {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images && product.images[0] ? product.images[0] : "",
      },
    });
  };

  const toggleFavorite = () => {
    setIsFavorite((prev) => !prev);
  };

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
      <h3 className="font-semibold mb-2 text-[#453E3E]">{product.name}</h3>
      <p className="text-muted-foreground text-sm mb-4">
        {product.description}
      </p>
      <div className="flex flex-col gap-4">
        <span className="text-lg font-bold">{formatPrice(product.price)}</span>
        <Link
          href={`/user/${product.seller.slug}`}
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
          className="flex-1 flex items-center justify-center gap-2 bg-[#453E3E] hover:bg-[#2A2424] text-white"
        >
          <ShoppingCart className="h-4 w-4" />
          Add to Cart
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
