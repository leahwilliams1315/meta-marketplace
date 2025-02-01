"use client";

import { useState } from "react";

export const StripeOnboardingButton = () => {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Replace with the actual user's email as needed
        body: JSON.stringify({ email: "user@example.com" }),
      });
      if (!res.ok) {
        throw new Error("Failed to create Stripe connect account");
      }
      const data = await res.json();
      window.location.href = data.url;
    } catch (error) {
      console.error("Stripe onboarding error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleConnect}
      className="btn btn-secondary"
      disabled={loading}
    >
      {loading ? "Connecting..." : "Connect Stripe Account"}
    </button>
  );
};
