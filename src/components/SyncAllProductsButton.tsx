"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProductSyncItem {
  id: string;
  name: string;
  description: string;
  stripeProductId?: string | null;
}

interface SyncAllProductsButtonProps {
  products: ProductSyncItem[];
}

export function SyncAllProductsButton({
  products,
}: SyncAllProductsButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const unsyncedProducts = products.filter((p) => !p.stripeProductId);

  async function handleSyncAll() {
    setLoading(true);
    setError("");
    try {
      await Promise.all(
        unsyncedProducts.map(async (product) => {
          const res = await fetch("/api/products/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: product.id,
              name: product.name,
              description: product.description,
            }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(
              data.error || `Failed to sync product ${product.name}`
            );
          }
        })
      );
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4">
      <button
        onClick={handleSyncAll}
        className="btn btn-primary"
        disabled={loading || unsyncedProducts.length === 0}
      >
        {loading
          ? "Syncing..."
          : unsyncedProducts.length === 0
          ? "All Products Synced"
          : `Sync All (${unsyncedProducts.length})`}
      </button>
      {error && <p className="text-destructive text-xs mt-2">{error}</p>}
    </div>
  );
}
