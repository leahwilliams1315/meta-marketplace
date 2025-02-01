"use client";

import { useAuth, SignIn, SignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";

export default function CreateMarketplacePage() {
  const router = useRouter();
  const { userId, isLoaded } = useAuth();

  const [activeAuthForm, setActiveAuthForm] = useState<"sign_in" | "sign_up">(
    "sign_in"
  );

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

  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="card max-w-md w-full p-6 space-y-6">
          <h2 className="text-2xl font-bold text-center">
            Create a Marketplace
          </h2>
          <p className="text-center text-muted-foreground">
            Please sign in or sign up below.
          </p>
          <div className="flex border-b border-border">
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeAuthForm === "sign_in"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground"
              }`}
              onClick={() => setActiveAuthForm("sign_in")}
            >
              Sign In
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeAuthForm === "sign_up"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground"
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
                  formFieldInput: "input",
                  formButtonPrimary: "btn btn-primary",
                },
              }}
            />
          ) : (
            <SignUp
              afterSignUpUrl="/create-marketplace"
              appearance={{
                elements: {
                  card: "shadow-none p-0 border-0",
                  formFieldInput: "input",
                  formButtonPrimary: "btn btn-primary",
                },
              }}
            />
          )}
        </div>
      </div>
    );
  }

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

      const data = await res.json();
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
    <div className="flex flex-col items-center justify-center p-6 min-h-screen">
      <div className="card max-w-lg w-full p-6">
        {successSlug ? (
          <div className="text-center space-y-4">
            <p className="text-green-600 text-lg">
              Marketplace created successfully! Slug:{" "}
              <strong>{successSlug}</strong>
            </p>
            <button onClick={handleGoToMarketplace} className="btn btn-primary">
              View Marketplace
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4 text-center">
              Create Your Marketplace
            </h2>
            {error && (
              <div className="p-3 mb-4 text-destructive border border-destructive rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Name</label>
                <input
                  className="input w-full"
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
                  className="input w-full"
                  rows={4}
                  placeholder="A place for local potters to share and sell..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full"
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
