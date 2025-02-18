import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(_req: Request) {
  void _req;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { stripeAccountId: null },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Stripe Disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Stripe account" },
      { status: 500 }
    );
  }
}
