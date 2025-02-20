"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteProductButtonProps {
  productId: string;
  stripeProductId?: string | null;
}

export default function DeleteProductButton({
  productId,
  stripeProductId,
}: DeleteProductButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showStripeDialog, setShowStripeDialog] = useState(false);

  const handleDelete = async (deleteStripe: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteStripe }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Error deleting product");
    } finally {
      setLoading(false);
    }
  };

  const handleLocalConfirm = () => {
    if (stripeProductId) {
      setShowStripeDialog(true);
    } else {
      handleDelete(false);
    }
  };

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-600"
            disabled={loading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLocalConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stripe deletion confirmation dialog */}
      <AlertDialog open={showStripeDialog} onOpenChange={setShowStripeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete from Stripe</AlertDialogTitle>
            <AlertDialogDescription>
              Would you also like to delete this product from Stripe? This will
              remove the product from your Stripe dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleDelete(false)}>
              No, keep in Stripe
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, delete from Stripe
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
