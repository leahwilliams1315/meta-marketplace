"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreateProductForm } from "@/components/CreateProductForm";

interface Price {
  id?: string;
  unitAmount: number;
  currency: 'USD';
  isDefault: boolean;
  paymentStyle: "INSTANT" | "REQUEST";
  allocatedQuantity: number;
  marketplaceId?: string;
}

interface Product {
  name: string;
  description: string;
  images: string[];
  prices: Price[];
}

export default function CreateProductContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = searchParams.get("productId");

  const [initialData, setInitialData] = useState<Product | null>(null);
  const [marketplaces, setMarketplaces] = useState<
    { id: string; name: string; slug: string }[]
  >([]);

  useEffect(() => {
    // Fetch list of marketplaces
    async function fetchMarketplaces() {
      const res = await fetch("/api/marketplaces");
      if (res.ok) {
        const data = await res.json();
        setMarketplaces(data);
      }
    }
    fetchMarketplaces();

    if (productId) {
      // If editing, fetch the product details
      async function fetchProduct() {
        const res = await fetch(`/api/products/${productId}`);
        if (res.ok) {
          const data = await res.json();
          setInitialData({
            name: data.name,
            description: data.description,
            images: data.images || [],
            prices: data.prices.map((p: Price) => ({
              id: p.id,
              unitAmount: p.unitAmount,
              currency: p.currency,
              isDefault: p.isDefault,
              paymentStyle: p.paymentStyle,
              allocatedQuantity: p.allocatedQuantity,
              marketplaceId: p.marketplaceId
            }))
          });
        }
      }
      fetchProduct();
    }
  }, [productId]);

  async function handleSubmit(formData: Product) {
    const url = "/api/products";
    const method = productId ? "PUT" : "POST";
    const body = productId ? { productId, ...formData } : formData;
    
    // Ensure at least one price is marked as default
    if (!formData.prices.some(p => p.isDefault)) {
      console.error("At least one price must be marked as default");
      return;
    }
    
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      console.error("Failed to save product");
    }
  }

  if (marketplaces.length === 0) {
    return <div>Loading marketplaces...</div>;
  }

  return (
    <>
      <h1 className="font-display text-3xl md:text-4xl font-bold mb-3 text-[#453E3E]">
        {productId ? "Edit Product" : "Create Product"}
      </h1>
      <p className="text-[#666666] mb-12">
        {productId
          ? "Update your product details and sync with Stripe."
          : "Add a new product to your marketplace."}
      </p>
      <div className="bg-white rounded-lg border border-[#E5E5E5] p-8">
        <CreateProductForm
          marketplaces={marketplaces}
          initialData={initialData}
          onSubmitForm={handleSubmit}
        />
      </div>
    </>
  );
}
