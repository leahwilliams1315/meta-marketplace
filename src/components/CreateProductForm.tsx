"use client";

import { useState, useEffect } from "react";
import { CldUploadWidget } from "next-cloudinary";
import { PriceList, type Price } from "./PriceList";
import Image from "next/image";
import { MultipleSelector, type Option } from '@/components/ui/multiple-selector';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Marketplace {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  name: string;
  description: string;
  images: string[];
  prices: Price[];
  tags: Option[];
}

interface CreateProductFormProps {
  marketplaces: Marketplace[];
  initialData?: Product | null;
  onSubmitForm: (formData: Product) => Promise<void>;
}

export const CreateProductForm = ({
  marketplaces,
  initialData,
  onSubmitForm,
}: CreateProductFormProps) => {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [prices, setPrices] = useState<Price[]>(
    initialData?.prices || [{
      unitAmount: 0,
      currency: "USD",
      isDefault: true,
      paymentStyle: "INSTANT",
      allocatedQuantity: 1
    }]
  );
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [selectedTags, setSelectedTags] = useState<Option[]>([]);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  // Fetch all available tags using React Query
  const { data: availableTags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await fetch('/api/tags');
      if (!res.ok) throw new Error('Failed to fetch tags');
      const tags = await res.json();
      return tags.map((tag: { id: number; name: string }) => ({
        value: tag.id.toString(),
        label: tag.name
      }));
    }
  });
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
      setPrices(initialData.prices);
      setImages(initialData.images);
      setSelectedTags(initialData.tags || []);
    }
  }, [initialData]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Validate name
      if (!name.trim()) {
        throw new Error("Please enter a product name");
      }

      // Validate prices
      if (prices.length === 0) {
        throw new Error("Please add at least one price");
      }
      
      // Validate default price
      const defaultPrices = prices.filter(p => p.isDefault);
      if (defaultPrices.length !== 1) {
        throw new Error("Please set exactly one default price");
      }

      // Validate price amounts
      const invalidPrices = prices.filter(p => p.unitAmount <= 0);
      if (invalidPrices.length > 0) {
        throw new Error("All prices must be greater than zero");
      }

      // Validate quantities
      const invalidQuantities = prices.filter(p => p.allocatedQuantity < 1);
      if (invalidQuantities.length > 0) {
        throw new Error("All quantities must be at least 1");
      }

      // Check for duplicate marketplace prices
      const marketplacePrices = prices.filter(p => p.marketplaceId);
      const marketplaceIds = marketplacePrices.map(p => p.marketplaceId);
      if (marketplaceIds.length !== new Set(marketplaceIds).size) {
        throw new Error("Each marketplace can only have one price");
      }

      await onSubmitForm({
        name,
        description,
        images,
        prices,
        tags: selectedTags,
      });
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }


  debugger;
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm">
        {error}
      </div>
      )}

      <div>
        <label className="block mb-2 text-sm font-medium text-[#453E3E]">
          Name
        </label>
        <input
          className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
          placeholder="Enter product name"
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">Description</label>
        <textarea
          className="input w-full"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
        />
      </div>
      <div>
        <label className="block mb-2 text-sm font-medium text-[#453E3E]">
          Prices
        </label>
        <PriceList
          prices={prices}
          onChange={setPrices}
          className="mb-6"
          disabled={loading}
          marketplaces={marketplaces}
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">Product Images</label>
        <div className="space-y-4">
          <CldUploadWidget
            uploadPreset="First Test"
            options={{
              maxFiles: 5,
              sources: ['local', 'url', 'camera'],
              resourceType: "image",
              clientAllowedFormats: ["png", "jpeg", "jpg", "webp"],
              maxFileSize: 20000000, // 20MB
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onUpload={(result: any) => {
              if (result.info) {
                const imageUrl = result.info.secure_url;
                setImages([...images, imageUrl]);
              }
            }}
          >
            {({ open }) => {
              return (
                <button
                  type="button"
                  className="px-4 py-2 bg-white border border-[#E5E5E5] rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                  onClick={() => open()}
                  disabled={loading}
                >
                  Upload Image
                </button>
              );
            }}
          </CldUploadWidget>

          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((img, idx) => (
                <div key={idx} className="relative group">
                  <div className="relative w-full h-32">
                    <Image
                      src={img}
                      alt={`Product image ${idx + 1}`}
                      fill
                      className="object-cover rounded-md"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newImages = [...images];
                      newImages.splice(idx, 1);
                      setImages(newImages);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={loading}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="my-4 w-[300px]">
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags</label>
        <MultipleSelector
          placeholder="Select tags..."
          defaultOptions={availableTags}
          groupBy="category"
          value={selectedTags}
          onChange={setSelectedTags}
          minCharactersForAddNew={3}
          createNewPrompt="Press Enter to add as new tag"
          onCreateNew={async (value) => {
            try {
              const res = await fetch('/api/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: value, createdBy: 'system' })
              });
              const tag = await res.json();
              
              if (res.status === 201) {
                // Add the new tag to selected tags
                setSelectedTags((prev) => [...prev, { 
                  value: tag.id.toString(), 
                  label: tag.name 
                }]);
                
                // Invalidate the tags query to trigger a refresh
                await queryClient.invalidateQueries({ queryKey: ['tags'] });
              } else {
                alert(tag.error || 'Error creating tag');
              }
            } catch (error) {
              console.error(error);
              alert('Error creating tag');
            }
          }}
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading
          ? initialData
            ? "Updating..."
            : "Creating..."
          : initialData
          ? "Update Product"
          : "Create Product"}
      </button>
    </form>
  );
};
