import { auth } from "@clerk/nextjs/server";
import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      prices: true
    }
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Ensure the requester is the seller of the product
  if (product.sellerId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json(product);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { userId } = await auth();
  const { productId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.sellerId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { deleteStripe } = await request.json();

  if (deleteStripe && product.stripeProductId) {
    try {
      await stripe.products.del(product.stripeProductId);
    } catch (error) {
      console.error("Failed to delete product on Stripe:", error);
    }
  }

  await prisma.product.delete({
    where: { id: product.id },
  });

  return NextResponse.json({ success: true });
}
