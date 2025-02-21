"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProductSyncBadgeProps {
  productId: string;
  name: string;
  description: string;
  isSynced: boolean;
  images: string[];
}

export function ProductSyncBadge({
  productId,
  name,
  description,
  isSynced: initialSynced,
}: ProductSyncBadgeProps) {
  const [isSynced, setIsSynced] = useState(initialSynced);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSync() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/products/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, name, description }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Sync failed");
      }
      setIsSynced(true);
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-0.5 bg-white/90 backdrop-blur-sm rounded-full px-1 py-0.5 shadow-sm hover:bg-white/95 transition-colors">
      <div
        className={`text-[9px] font-medium flex items-center gap-0.5
          ${isSynced ? "text-green-700" : "text-yellow-700"}`}
      >
        <span
          className={`w-1 h-1 rounded-full ${
            isSynced ? "bg-green-500" : "bg-yellow-500"
          }`}
        />
        {isSynced ? "Synced" : "Force Sync"}
      </div>
      {!isSynced && (
        <button
          onClick={handleSync}
          disabled={loading}
          className="text-[9px] text-gray-500 hover:text-[#F97316] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <svg
              className="animate-spin h-2 w-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className="w-2 h-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
        </button>
      )}
      {error && (
        <div className="absolute top-full right-0 mt-1 text-[9px] text-red-500 bg-white/95 shadow-sm rounded-md px-1 py-0.5 z-10 whitespace-nowrap backdrop-blur-sm">
          {error}
        </div>
      )}
    </div>
  );
}
