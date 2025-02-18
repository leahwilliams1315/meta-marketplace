"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DollarSign, TrendingUp, BarChart, CalendarDays } from "lucide-react";

interface StripeAccountCardProps {
  initialStripeAccountId: string | null;
}

interface Insights {
  totalRevenue: string;
  averageCharge: string;
  transactions: number;
  lastTransaction: string; // formatted date
}

export default function StripeAccountCard({
  initialStripeAccountId,
}: StripeAccountCardProps) {
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(
    initialStripeAccountId
  );
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [insights, setInsights] = useState<Insights | null>(null);

  // Fetch insights when account is connected
  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch("/api/stripe/insights-summary");
        if (!res.ok) {
          throw new Error(`Failed to fetch insights: ${res.status}`);
        }
        const data = await res.json();
        setInsights(data);
      } catch (err: unknown) {
        console.error("Error fetching insights", err);
      }
    }
    if (stripeAccountId) {
      fetchInsights();
    }
  }, [stripeAccountId]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError("Email is required");
      return;
    }
    setLoading(true);
    setError("");
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
      // Redirect to Stripe onboarding url
      window.location.href = data.url;
    } catch (err: unknown) {
      console.error("Error connecting Stripe", err);
      setError("Failed to connect Stripe account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/stripe/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(
          `Disconnect request failed with status ${response.status}`
        );
      }
      const data = await response.json();
      if (data.success) {
        setStripeAccountId(null);
        setInsights(null);
      } else {
        setError("Failed to disconnect Stripe account.");
      }
    } catch (err: unknown) {
      console.error("Error disconnecting Stripe", err);
      setError("Failed to disconnect Stripe account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (stripeAccountId) {
    // Connected state
    return (
      <div className="w-full bg-white rounded-lg border border-[#E5E5E5] p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <p className="text-[#453E3E] font-medium">Connected to Stripe</p>
            </div>
            {insights && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <p className="text-xs font-semibold">Total Revenue</p>
                  </div>
                  <p className="text-lg font-bold text-[#453E3E]">
                    ${insights.totalRevenue}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <p className="text-xs font-semibold">Avg. Charge</p>
                  </div>
                  <p className="text-lg font-bold text-[#453E3E]">
                    ${insights.averageCharge}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <BarChart className="w-4 h-4" />
                    <p className="text-xs font-semibold">Transactions</p>
                  </div>
                  <p className="text-lg font-bold text-[#453E3E]">
                    {insights.transactions}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 text-orange-600 mb-1">
                    <CalendarDays className="w-4 h-4" />
                    <p className="text-xs font-semibold">Last Transaction</p>
                  </div>
                  <p className="text-sm font-medium text-[#453E3E]">
                    {insights.lastTransaction}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 mt-4 md:mt-0 md:ml-6 md:min-w-[200px]">
            <Link
              href="/dashboard/stripe"
              className="w-full text-center bg-[#453E3E] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#353535] transition-colors"
            >
              View Insights
            </Link>
            <a
              href="https://dashboard.stripe.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center bg-white border border-[#453E3E] text-[#453E3E] px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Stripe Dashboard
            </a>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="w-full text-center bg-white border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors"
            >
              {loading ? "Disconnecting..." : "Disconnect Account"}
            </button>
          </div>
        </div>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    );
  }

  // Not connected state
  return (
    <div className="w-full bg-white rounded-lg border border-[#E5E5E5] p-4 md:p-6">
      <form
        onSubmit={handleConnect}
        className="flex flex-col md:flex-row md:items-end gap-4"
      >
        <div className="flex-1">
          <p className="text-[#666666] mb-2 md:mb-4">
            Connect your Stripe account to start receiving payments and view
            insights:
          </p>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full md:w-auto whitespace-nowrap bg-[#453E3E] text-white px-6 py-2 rounded-lg hover:bg-[#353535] transition-colors"
        >
          {loading ? "Connecting..." : "Connect Stripe"}
        </button>
      </form>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
