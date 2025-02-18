import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { DollarSign, TrendingUp, BarChart } from "lucide-react";

export default async function StripeInsightsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.stripeAccountId) {
    return (
      <div className="min-h-screen bg-[#faf9f7] pt-24 flex items-center justify-center">
        <p className="text-xl text-[#666666]">No Stripe account connected.</p>
      </div>
    );
  }

  // Fetch account details from Stripe
  const account = await stripe.accounts.retrieve(user.stripeAccountId);

  // Fetch current balance
  const balance = await stripe.balance.retrieve(
    {},
    { stripeAccount: user.stripeAccountId }
  );

  // Fetch recent charges (limit to 5)
  const charges = await stripe.charges.list(
    { limit: 5 },
    { stripeAccount: user.stripeAccountId }
  );

  // Compute additional insights
  const totalRevenueCents = charges.data.reduce(
    (acc, charge) => acc + charge.amount,
    0
  );
  const totalRevenue = (totalRevenueCents / 100).toFixed(2);
  const averageCharge =
    charges.data.length > 0
      ? (totalRevenueCents / charges.data.length / 100).toFixed(2)
      : "0.00";

  return (
    <div className="min-h-screen bg-[#faf9f7] pt-24">
      <div className="container mx-auto px-4">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-6 text-[#453E3E] text-center">
          Stripe Insights
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* At a Glance Card */}
          <div className="p-6 bg-white rounded-lg border border-[#E5E5E5] flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-[#453E3E]">
              At a Glance
            </h2>
            <div className="flex items-center gap-2 text-green-600">
              <DollarSign className="w-5 h-5" />
              <div>
                <p className="text-sm font-bold">Total Revenue</p>
                <p className="text-sm">${totalRevenue}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-blue-600">
              <TrendingUp className="w-5 h-5" />
              <div>
                <p className="text-sm font-bold">Avg. Charge</p>
                <p className="text-sm">${averageCharge}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-purple-600">
              <BarChart className="w-5 h-5" />
              <div>
                <p className="text-sm font-bold">Transactions</p>
                <p className="text-sm">{charges.data.length}</p>
              </div>
            </div>
          </div>

          {/* Account Details Card */}
          <div className="p-6 bg-white rounded-lg border border-[#E5E5E5]">
            <h2 className="text-xl font-semibold text-[#453E3E] mb-4">
              Account Details
            </h2>
            <p>
              <strong>ID:</strong> {account.id}
            </p>
            <p>
              <strong>Type:</strong> {account.type}
            </p>
            <p>
              <strong>Country:</strong> {account.country}
            </p>
            {account.email && (
              <p>
                <strong>Email:</strong> {account.email}
              </p>
            )}
            {/* Link to Stripe Dashboard - for standard accounts, direct link might be https://dashboard.stripe.com/ */}
            <a
              href="https://dashboard.stripe.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block bg-[#453E3E] text-white px-6 py-2 rounded-full"
            >
              Go to Stripe Dashboard
            </a>
          </div>

          {/* Balance Card */}
          <div className="p-6 bg-white rounded-lg border border-[#E5E5E5]">
            <h2 className="text-xl font-semibold text-[#453E3E] mb-4">
              Current Balance
            </h2>
            <p>
              <strong>Available:</strong>{" "}
              {balance.available &&
                balance.available
                  .map(
                    (av) => `${av.amount / 100} ${av.currency.toUpperCase()}`
                  )
                  .join(", ")}
            </p>
            <p>
              <strong>Pending:</strong>{" "}
              {balance.pending &&
                balance.pending
                  .map(
                    (pd) => `${pd.amount / 100} ${pd.currency.toUpperCase()}`
                  )
                  .join(", ")}
            </p>
          </div>

          {/* Recent Charges Card */}
          <div className="p-6 bg-white rounded-lg border border-[#E5E5E5]">
            <h2 className="text-xl font-semibold text-[#453E3E] mb-4">
              Recent Charges
            </h2>
            {charges.data.length === 0 ? (
              <p>No recent charges.</p>
            ) : (
              <ul>
                {charges.data.map((charge) => (
                  <li key={charge.id} className="mb-2">
                    <p>
                      <strong>ID:</strong> {charge.id}
                    </p>
                    <p>
                      <strong>Amount:</strong> $
                      {(charge.amount / 100).toFixed(2)}{" "}
                      {charge.currency.toUpperCase()}
                    </p>
                    <p>
                      <strong>Status:</strong> {charge.status}
                    </p>
                    <p>
                      <strong>Date:</strong>{" "}
                      {new Date(charge.created * 1000).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
