import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { productId, name, description } = await req.json();
  if (!productId || !name || !description) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.sellerId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.stripeAccountId) {
    return NextResponse.json(
      { error: "Stripe account not connected" },
      { status: 400 }
    );
  }

  let updatedProduct = product;
  try {
    if (product.stripeProductId) {
      // Update existing Stripe product using merchant's stripe account
      const updatedStripeProduct = await stripe.products.update(
        product.stripeProductId,
        {
          name,
          description,
        },
        { stripeAccount: user.stripeAccountId }
      );
      if (!updatedStripeProduct) {
        throw new Error("Stripe product update returned null or undefined");
      }
    } else {
      // Check if a Stripe product already exists by searching for metadata using merchant's context
      const searchResults = await stripe.products.search(
        {
          query: `metadata['localProductId']:"${productId}"`,
          limit: 1,
        },
        { stripeAccount: user.stripeAccountId }
      );
      if (searchResults.data.length > 0) {
        // Found an existing Stripe product; update it
        const existingStripeProduct = searchResults.data[0];
        const updatedStripeProduct = await stripe.products.update(
          existingStripeProduct.id,
          { name, description },
          { stripeAccount: user.stripeAccountId }
        );
        if (!updatedStripeProduct) {
          throw new Error("Stripe product update returned null or undefined");
        }
        updatedProduct = await prisma.product.update({
          where: { id: productId },
          data: { stripeProductId: existingStripeProduct.id },
        });
      } else {
        // Create new Stripe product with metadata linking it to the local product
        const stripeProduct = await stripe.products.create(
          {
            name,
            description,
            metadata: { localProductId: productId },
          },
          { stripeAccount: user.stripeAccountId }
        );
        if (!stripeProduct || !stripeProduct.id) {
          throw new Error("Stripe product creation returned null or missing id");
        }
        updatedProduct = await prisma.product.update({
          where: { id: productId },
          data: { stripeProductId: stripeProduct.id },
        });
      }
    }
    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Sync error details:", error || {});
    const errorMsg =
      (error &&
        typeof error === "object" &&
        "message" in error &&
        (error as Error).message) ||
      "Sync failed";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
