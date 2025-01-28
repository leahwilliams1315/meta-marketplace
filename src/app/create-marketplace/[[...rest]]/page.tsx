"use client";

import { useAuth, SignIn, SignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";

export default function CreateMarketplacePage() {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();

  // Tab for sign in vs. sign up if user is not logged in
  const [activeAuthForm, setActiveAuthForm] = useState<"sign_in" | "sign_up">(
    "sign_in"
  );

  // Marketplace creation form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [successSlug, setSuccessSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // If user not signed in -> show sign in / sign up inline
  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full p-6 bg-white rounded shadow space-y-6">
          <h2 className="text-2xl font-bold text-center">
            Create a Marketplace
          </h2>
          <p className="text-center text-gray-600">
            Please sign in or sign up below (or use the Sign In button in the
            nav).
          </p>

          <div className="flex border-b border-gray-200">
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeAuthForm === "sign_in"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveAuthForm("sign_in")}
            >
              Sign In
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeAuthForm === "sign_up"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveAuthForm("sign_up")}
            >
              Sign Up
            </button>
          </div>

          {activeAuthForm === "sign_in" ? (
            <SignIn
              afterSignInUrl="/create-marketplace"
              appearance={{
                elements: {
                  card: "shadow-none p-0 border-0",
                  formFieldInput: "bg-gray-100 rounded",
                  formButtonPrimary:
                    "bg-blue-600 hover:bg-blue-700 text-white border-0",
                },
              }}
            />
          ) : (
            <SignUp
              afterSignUpUrl="/create-marketplace"
              appearance={{
                elements: {
                  card: "shadow-none p-0 border-0",
                  formFieldInput: "bg-gray-100 rounded",
                  formButtonPrimary:
                    "bg-blue-600 hover:bg-blue-700 text-white border-0",
                },
              }}
            />
          )}
        </div>
      </div>
    );
  }

  // Else user is signed in -> show creation form
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/marketplaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        const { error: serverError } = await res.json();
        throw new Error(serverError || "Failed to create marketplace");
      }

      const data = (await res.json()) as { slug: string };
      setSuccessSlug(data.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  function handleGoToMarketplace() {
    if (successSlug) {
      router.push(`/marketplace/${successSlug}`);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 min-h-screen">
      <div className="max-w-lg w-full p-6 bg-white rounded shadow">
        {successSlug ? (
          <div className="text-center space-y-4">
            <p className="text-green-600 text-lg">
              Marketplace created successfully! Slug:{" "}
              <strong>{successSlug}</strong>
            </p>
            <button
              onClick={handleGoToMarketplace}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded"
            >
              View Marketplace
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4 text-center">
              Create Your Marketplace
            </h2>
            {error && (
              <div className="p-3 mb-4 text-red-600 border border-red-300 rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Name</label>
                <input
                  className="w-full p-2 border border-gray-300 rounded"
                  type="text"
                  placeholder="e.g., Toronto Pottery Community"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded"
                  rows={4}
                  placeholder="A place for local potters to share and sell..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create Marketplace"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
