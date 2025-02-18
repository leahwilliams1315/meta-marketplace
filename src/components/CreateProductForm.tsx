"use client";

import { useState, useEffect } from "react";

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
  const [tempImage, setTempImage] = useState("");

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

  function handleAddImage() {
    if (tempImage) {
      setImages([...images, tempImage]);
      setTempImage("");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="text-destructive">{error}</div>}
      <div>
        <label className="block mb-1 font-medium">Marketplace</label>
        <select
          className="input w-full"
          value={selectedMarketplaceId}
          onChange={(e) => setSelectedMarketplaceId(e.target.value)}
          required
        >
          {marketplaces.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block mb-1 font-medium">Name</label>
        <input
          className="input w-full"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
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
        <label className="block mb-1 font-medium">Image URL</label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="text"
            value={tempImage}
            onChange={(e) => setTempImage(e.target.value)}
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleAddImage}
            className="btn btn-secondary"
            disabled={loading}
          >
            Add
          </button>
        </div>
        {images.length > 0 && (
          <ul className="list-disc ml-5 mt-1">
            {images.map((img, idx) => (
              <li key={idx}>{img}</li>
            ))}
          </ul>
        )}
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
