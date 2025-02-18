import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  try {
    const { name, description, price, images, marketplaceId } =
      await req.json();

    // 1) Verify the user is a member or owner of the marketplace
    const marketplace = await prisma.marketplace.findUnique({
      where: { id: marketplaceId },
      include: { members: true, owners: true },
    });
    if (!marketplace) {
      return NextResponse.json(
        { error: "Marketplace not found" },
        { status: 404 }
      );
    }

    const isMemberOrOwner =
      marketplace.members.some((m) => m.id === userId) ||
      marketplace.owners.some((o) => o.id === userId);

    if (!isMemberOrOwner) {
      return NextResponse.json(
        { error: "You are not a member of this marketplace" },
        { status: 403 }
      );
    }

    // 2) Create the product
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: price || 0,
        images: images || [],
        sellerId: userId,
        marketplaceId,
      },
    });

    // Sync with Stripe if the user has a Stripe account
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (currentUser?.stripeAccountId) {
      try {
        const stripeProduct = await stripe.products.create(
          {
            name,
            description,
          },
          { stripeAccount: currentUser.stripeAccountId }
        );
        const updatedProduct = await prisma.product.update({
          where: { id: product.id },
          data: { stripeProductId: stripeProduct.id },
        });
        return NextResponse.json(updatedProduct);
      } catch (stripeError) {
        console.error("Stripe sync error:", stripeError);
      }
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}

// New PUT handler for updating a product and syncing with Stripe
export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  try {
    const { productId, name, description, price, images } = await req.json();

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Ensure the requester is the seller of the product
    if (existingProduct.sellerId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        description,
        price: price || 0,
        images: images || [],
      },
    });

    // Sync update with Stripe if user has a Stripe account
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (currentUser?.stripeAccountId) {
      if (updatedProduct.stripeProductId) {
        try {
          await stripe.products.update(updatedProduct.stripeProductId, {
            name,
            description,
          });
        } catch (stripeError) {
          console.error("Stripe update error:", stripeError);
        }
      } else {
        try {
          const stripeProduct = await stripe.products.create(
            {
              name,
              description,
            },
            { stripeAccount: currentUser.stripeAccountId }
          );
          updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: { stripeProductId: stripeProduct.id },
          });
        } catch (stripeError) {
          console.error("Stripe sync error:", stripeError);
        }
      }
    }

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}
