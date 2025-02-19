"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MarketplaceJoinButtonProps {
  marketplaceId: string;
  initialIsMember: boolean;
  disabled?: boolean;
}

export function MarketplaceJoinButton({
  marketplaceId,
  initialIsMember,
  disabled,
}: MarketplaceJoinButtonProps) {
  const [isMember, setIsMember] = useState(initialIsMember);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleToggleMembership = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/marketplaces/${marketplaceId}/membership`, {
        method: isMember ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to update membership");
      }

      setIsMember(!isMember);
      router.refresh();
    } catch (error) {
      console.error("Error updating membership:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleMembership}
      disabled={isLoading || disabled}
      className={`px-4 py-2 rounded-md font-medium transition-colors ${
        isMember
          ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
          : "bg-[#F97316] text-white hover:bg-[#EA580C]"
      } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
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
          Processing...
        </span>
      ) : isMember ? (
        "Leave Marketplace"
      ) : (
        "Join Marketplace"
      )}
    </button>
  );
}
