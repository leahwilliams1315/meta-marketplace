"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/cart";
import { Check, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PurchaseRequestCardProps {
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

export function PurchaseRequestCard({ request }: PurchaseRequestCardProps) {
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/purchase-requests/${request.id}/approve`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to approve request");
      }

      // Refresh the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error("Error approving request:", error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
      setIsApproveDialogOpen(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/purchase-requests/${request.id}/reject`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to reject request");
      }

      // Refresh the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error("Error rejecting request:", error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
      setIsRejectDialogOpen(false);
    }
  };


  return (
    <div className="bg-white rounded-lg border border-[#E5E5E5] p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#453E3E] flex items-center justify-center text-white">
            {request.buyer.imageUrl ? (
              <Image
                src={request.buyer.imageUrl}
                alt={request.buyer.name || ""}
                fill
                className="object-cover"
              />
            ) : (
              <span className="text-sm">
                {(request.buyer.name || "A")[0].toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-medium text-[#453E3E]">
              {request.buyer.name || "Anonymous"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {new Date(request.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium text-[#453E3E]">{formatPrice(request.price.unitAmount)}</div>
          <div className="text-sm text-muted-foreground">
            1 item
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-md overflow-hidden bg-[#faf9f7]">
            <Image
              src={(request.product.images as string[])[0] || ""}
              alt={request.product.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm text-[#453E3E]">
              {request.product.name}
            </h4>
            <p className="text-sm text-muted-foreground">
              Quantity: 1
            </p>
          </div>
          <div className="text-right">
            <div className="font-medium text-sm text-[#453E3E]">
              {formatPrice(request.price.unitAmount)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="default"
          className="flex-1 bg-[#453E3E] hover:bg-[#2A2424] text-white"
          onClick={() => setIsApproveDialogOpen(true)}
          disabled={isLoading}
        >
          <Check className="w-4 h-4 mr-2" />
          Approve
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => setIsRejectDialogOpen(true)}
          disabled={isLoading}
        >
          <X className="w-4 h-4 mr-2" />
          Reject
        </Button>
      </div>

      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Purchase Request</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve the purchase request and notify the buyer. They will be able to proceed with payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove}>
              Approve Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Purchase Request</AlertDialogTitle>
            <AlertDialogDescription>
              This will reject the purchase request and notify the buyer. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-red-600">
              Reject Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
