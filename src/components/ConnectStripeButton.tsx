"use client";

import { useState } from "react";

export default function ConnectStripeButton() {
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    // Prompt user for email (if not already provided by your app, you might refine this logic)
    const email = window.prompt(
      "Please enter your email for Stripe onboarding:"
    );
    if (!email) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data = await response.json();
      // Redirect the user to the Stripe onboarding URL
      window.location.href = data.url;
    } catch (error) {
      console.error("Error connecting Stripe", error);
      alert("Failed to connect Stripe account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="inline-block bg-[#453E3E] text-white px-6 py-2 rounded-full"
    >
      {loading ? "Connecting..." : "Connect Stripe"}
    </button>
  );
}
