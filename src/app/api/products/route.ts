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
        images: images || [],
        sellerId: userId,
        marketplaceId,
        totalQuantity: 0, // Will be updated when prices are created
      },
    });

    // Sync with Stripe if the user has a Stripe account
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (currentUser?.stripeAccountId) {
      try {
        // Create the product in Stripe
        const stripeProduct = await stripe.products.create(
          {
            name,
            description,
          },
          { stripeAccount: currentUser.stripeAccountId }
        );

        // Create a default price in Stripe
        const stripePrice = await stripe.prices.create(
          {
            unit_amount: price,
            currency: "usd",
            product: stripeProduct.id,
          },
          { stripeAccount: currentUser.stripeAccountId }
        );

        // Update product with Stripe ID and create default price
        const updatedProduct = await prisma.product.update({
          where: { id: product.id },
          data: {
            stripeProductId: stripeProduct.id,
            prices: {
              create: {
                stripePriceId: stripePrice.id,
                unitAmount: price,
                currency: "usd",
                isDefault: true,
                paymentStyle: "INSTANT",
                allocatedQuantity: 0,
              },
            },
          },
          include: {
            prices: true,
          },
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

    // Get the existing product with its default price
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        prices: true,
      },
    });
    
    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Ensure the requester is the seller of the product
    if (existingProduct.sellerId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update the product
    let updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        description,
        images: images || [],
      },
      include: {
        prices: {
          where: { isDefault: true },
        },
      },
    }) as typeof existingProduct;

    // Sync update with Stripe if user has a Stripe account
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (currentUser?.stripeAccountId) {
      if (updatedProduct.stripeProductId) {
        try {
          // Update the Stripe product
          await stripe.products.update(updatedProduct.stripeProductId, {
            name,
            description,
          });

          // Update the default price if price has changed
          const defaultPrice = existingProduct.prices.find(p => p.isDefault);
          if (defaultPrice && price !== defaultPrice.unitAmount) {
            const stripePrice = await stripe.prices.create(
              {
                unit_amount: price,
                currency: "usd",
                product: updatedProduct.stripeProductId,
              },
              { stripeAccount: currentUser.stripeAccountId }
            );

            // Update the default price and refresh the product data
            await prisma.price.update({
              where: { id: defaultPrice.id },
              data: {
                stripePriceId: stripePrice.id,
                unitAmount: price,
              },
            });

            // Refresh the product data to get updated prices
            updatedProduct = await prisma.product.findUnique({
              where: { id: productId },
              include: {
                prices: true,
              },
            }) as typeof existingProduct;
          }
        } catch (stripeError) {
          console.error("Stripe update error:", stripeError);
        }
      } else {
        try {
          // Create new Stripe product and price
          const stripeProduct = await stripe.products.create(
            {
              name,
              description,
            },
            { stripeAccount: currentUser.stripeAccountId }
          );

          const stripePrice = await stripe.prices.create(
            {
              unit_amount: price,
              currency: "usd",
              product: stripeProduct.id,
            },
            { stripeAccount: currentUser.stripeAccountId }
          );

          // Update product with Stripe ID and create default price
          updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: {
              stripeProductId: stripeProduct.id,
              prices: {
                create: {
                  stripePriceId: stripePrice.id,
                  unitAmount: price,
                  currency: "usd",
                  isDefault: true,
                  paymentStyle: "INSTANT",
                  allocatedQuantity: 0,
                },
              },
            },
            include: {
              prices: true,
            },
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
