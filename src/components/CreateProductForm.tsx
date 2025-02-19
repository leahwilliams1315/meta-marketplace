"use client";

import { useState, useEffect } from "react";
import { CldUploadWidget } from "next-cloudinary";

interface Marketplace {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  name: string;
  description: string;
  price: number;
  images: string[];
  marketplaceId: string;
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
  const [price, setPrice] = useState(
    initialData ? initialData.price.toString() : "0"
  );
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState(
    initialData?.marketplaceId || (marketplaces[0]?.id ?? "")
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
      setPrice(initialData.price.toString());
      setImages(initialData.images);
      setSelectedMarketplaceId(initialData.marketplaceId);
    }
  }, [initialData]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onSubmitForm({
        name,
        description,
        price: parseInt(price, 10),
        images,
        marketplaceId: selectedMarketplaceId,
      });
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }



  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      <div>
        <label className="block mb-2 text-sm font-medium text-[#453E3E]">
          Marketplace
        </label>
        <select
          className="w-full px-3 py-2 bg-white border border-[#E5E5E5] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
          value={selectedMarketplaceId}
          onChange={(e) => setSelectedMarketplaceId(e.target.value)}
          required
          disabled={loading}
        >
          {marketplaces.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
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
        <label className="block mb-1 font-medium">Price (in cents)</label>
        <input
          className="input w-full"
          type="number"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={loading}
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
              maxFileSize: 10000000, // 10MB
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
                  <img
                    src={img}
                    alt={`Product image ${idx + 1}`}
                    className="w-full h-32 object-cover rounded-md"
                  />
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
