import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.stripeAccountId) {
    return NextResponse.json(
      { error: "No Stripe account connected" },
      { status: 400 }
    );
  }

  // Fetch recent charges (limit to 5) from Stripe
  const charges = await stripe.charges.list(
    { limit: 5 },
    { stripeAccount: user.stripeAccountId }
  );

  // Compute insights
  const totalRevenueCents = charges.data.reduce(
    (acc, charge) => acc + charge.amount,
    0
  );
  const totalRevenue = (totalRevenueCents / 100).toFixed(2);
  const transactions = charges.data.length;
  const averageCharge =
    transactions > 0
      ? (totalRevenueCents / transactions / 100).toFixed(2)
      : "0.00";

  let lastTransaction = "N/A";
  if (transactions > 0) {
    const sortedCharges = [...charges.data].sort(
      (a, b) => b.created - a.created
    );
    lastTransaction = new Date(
      sortedCharges[0].created * 1000
    ).toLocaleString();
  }

  const insights = {
    totalRevenue,
    averageCharge,
    transactions,
    lastTransaction,
  };
  return NextResponse.json(insights);
}
