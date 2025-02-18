"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreateProductForm } from "@/components/CreateProductForm";

interface Product {
  name: string;
  description: string;
  price: number;
  images: string[];
  marketplaceId: string;
}

export default function CreateProductPage() {
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
            price: data.price,
            images: data.images,
            marketplaceId: data.marketplaceId,
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
    <div className="min-h-screen bg-[#faf9f7] pt-24">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
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
        </div>
      </div>
    </div>
  );
}
