"use client";

import Image from "next/image";
import { formatPrice } from "@/lib/cart";
import { Badge } from "@/components/ui/badge";

interface MiniPurchaseRequestCardProps {
  request: {
    id: string;
    status: string;
    buyer: {
      id: string;
      name?: string;
      imageUrl?: string;
    };
    product: {
      id: string;
      name: string;
      images: string[];
    };
    price: {
      unitAmount: number;
      paymentStyle: string;
    };
    createdAt: Date;
  };
}

export function MiniPurchaseRequestCard({ request }: MiniPurchaseRequestCardProps) {
  return (
    <div className="bg-white rounded-lg border border-[#E5E5E5] p-4">
      <div className="flex items-start gap-3">
        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-[#faf9f7]">
          <Image
            src={(request.product.images as string[])[0] || ""}
            alt={request.product.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm text-[#453E3E] truncate">
              {request.product.name}
            </h4>
            <Badge 
              variant={
                request.status === "PENDING"
                  ? "outline"
                  : request.status === "APPROVED"
                  ? "default"
                  : "destructive"
              }
              className="shrink-0"
            >
              {request.status}
            </Badge>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-muted-foreground">
              From: {request.buyer.name || "Anonymous"}
            </p>
            <p className="text-sm font-medium text-[#453E3E]">
              {formatPrice(request.price.unitAmount)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
