import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { Price } from "@prisma/client";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  try {
    const { name, description, images, prices }: {
      name: string;
      description?: string;
      images?: string[];
      prices: Array<{
        unitAmount: number;
        currency: string;
        isDefault: boolean;
        paymentStyle: "INSTANT" | "REQUEST";
        allocatedQuantity: number;
        marketplaceId?: string;
      }>;
    } = await req.json();
    
    // Validate request
    if (!prices?.length) {
      return NextResponse.json(
        { error: "At least one price is required" },
        { status: 400 }
      );
    }

    if (!prices.some(p => p.isDefault)) {
      return NextResponse.json(
        { error: "At least one price must be marked as default" },
        { status: 400 }
      );
    }

    // Get all unique marketplace IDs from prices
    const marketplaceIds = [...new Set(prices
      .map((p) => p.marketplaceId)
      .filter(Boolean))] as string[];

    // Verify marketplace access if any marketplace-specific prices
    if (marketplaceIds.length > 0) {
      const marketplaces = await prisma.marketplace.findMany({
        where: { id: { in: marketplaceIds } },
        include: { members: true, owners: true },
      });

      if (marketplaces.length !== marketplaceIds.length) {
        return NextResponse.json(
          { error: "One or more marketplaces not found" },
          { status: 404 }
        );
      }

      for (const marketplace of marketplaces) {
        const isMemberOrOwner =
          marketplace.members.some((m) => m.id === userId) ||
          marketplace.owners.some((o) => o.id === userId);

        if (!isMemberOrOwner) {
          return NextResponse.json(
            { error: `You are not a member of marketplace: ${marketplace.name}` },
            { status: 403 }
          );
        }
      }
    }

    // Get user's Stripe account status
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    
    // Initialize Stripe product and price IDs
    let stripeProductId: string | null = null;
    let stripePriceIds: string[] = [];

    // If user has Stripe account, create everything in Stripe first
    if (currentUser?.stripeAccountId) {
      try {
        // 1. Create product in Stripe
        const stripeProduct = await stripe.products.create(
          { name, description },
          { stripeAccount: currentUser.stripeAccountId }
        );
        stripeProductId = stripeProduct.id;

        // 2. Create all prices in Stripe
        const stripePrices = await Promise.all(
          prices.map(price =>
            stripe.prices.create(
              {
                unit_amount: price.unitAmount,
                currency: price.currency.toLowerCase(),
                product: stripeProduct.id,
              },
              { stripeAccount: currentUser.stripeAccountId! }
            )
          )
        );
        stripePriceIds = stripePrices.map(p => p.id);
      } catch (stripeError) {
        console.error("Stripe sync error:", stripeError);
        // If Stripe creation fails, we don't proceed with database creation
        return NextResponse.json(
          { error: "Failed to create product in Stripe" },
          { status: 500 }
        );
      }
    }

    // Now create in our database
    try {
      const product = await prisma.product.create({
        data: {
          name,
          description: description || "",
          images: images || [],
          sellerId: userId,
          stripeProductId, // Will be null if no Stripe account
          totalQuantity: prices.reduce((total, p) => total + p.allocatedQuantity, 0),
          prices: {
            create: prices.map((price, index) => ({
              stripePriceId: currentUser?.stripeAccountId 
                ? stripePriceIds[index]  // Use Stripe price ID if we created one
                : 'pending_stripe_setup', // Otherwise use placeholder
              unitAmount: price.unitAmount,
              currency: price.currency,
              isDefault: price.isDefault,
              paymentStyle: price.paymentStyle,
              allocatedQuantity: price.allocatedQuantity,
              marketplaceId: price.marketplaceId,
            })),
          },
        },
        include: {
          prices: true,
        },
      });

      return NextResponse.json(product);
    } catch (dbError) {
      console.error("Database error:", dbError);
      
      // If database creation fails but we created Stripe resources, clean them up
      if (stripeProductId && currentUser?.stripeAccountId) {
        try {
          await stripe.products.del(
            stripeProductId,
            { stripeAccount: currentUser.stripeAccountId }
          );
        } catch (cleanupError) {
          console.error("Failed to cleanup Stripe resources:", cleanupError);
        }
      }
      
      return NextResponse.json(
        { error: "Failed to create product in database" },
        { status: 500 }
      );
    }

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
    const { productId, name, description, images, prices }: { productId: string; name: string; description?: string; images?: string[]; prices: Price[] } = await req.json();

    // Get the existing product with its prices
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

    // Get all unique marketplace IDs from prices
    const marketplaceIds = [...new Set(prices
      .map((p) => p.marketplaceId)
      .filter(Boolean))] as string[];

    // Verify marketplace access if any marketplace-specific prices
    if (marketplaceIds.length > 0) {
      const marketplaces = await prisma.marketplace.findMany({
        where: { id: { in: marketplaceIds } },
        include: { members: true, owners: true },
      });

      if (marketplaces.length !== marketplaceIds.length) {
        return NextResponse.json(
          { error: "One or more marketplaces not found" },
          { status: 404 }
        );
      }

      for (const marketplace of marketplaces) {
        const isMemberOrOwner =
          marketplace.members.some((m) => m.id === userId) ||
          marketplace.owners.some((o) => o.id === userId);

        if (!isMemberOrOwner) {
          return NextResponse.json(
            { error: `You are not a member of marketplace: ${marketplace.name}` },
            { status: 403 }
          );
        }
      }
    }

    // Update the product
    let updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        description: description || "",
        images: images || [],
        totalQuantity: prices.reduce((total, p) => total + p.allocatedQuantity, 0),
      },
      include: {
        prices: true,
      },
    });

    // Handle price updates
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });

    if (currentUser?.stripeAccountId) {
      try {
        // Update the product in Stripe if it exists
        if (updatedProduct.stripeProductId) {
          await stripe.products.update(
            updatedProduct.stripeProductId,
            { name, description },
            { stripeAccount: currentUser.stripeAccountId }
          );
        } else {
          // Create new Stripe product if it doesn't exist
          const stripeProduct = await stripe.products.create(
            { name, description },
            { stripeAccount: currentUser.stripeAccountId }
          );
          updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: { stripeProductId: stripeProduct.id },
            include: { prices: true },
          });
        }

        // Handle price updates
        for (const price of prices) {
          if (price.id) {
            // Update existing price
            const existingPrice = existingProduct.prices.find(p => p.id === price.id);
            if (existingPrice?.stripePriceId && existingPrice.stripePriceId !== 'pending_stripe_setup') {
              // If price amount changed, create new Stripe price (they can't be updated)
              if (existingPrice.unitAmount !== price.unitAmount) {
                const stripePrice = await stripe.prices.create(
                  {
                    unit_amount: price.unitAmount,
                    currency: price.currency.toLowerCase(),
                    product: updatedProduct.stripeProductId!,
                  },
                  { stripeAccount: currentUser.stripeAccountId }
                );
                // Deactivate old price
                await stripe.prices.update(
                  existingPrice.stripePriceId,
                  { active: false },
                  { stripeAccount: currentUser.stripeAccountId }
                );
                // Update with new Stripe price ID
                await prisma.price.update({
                  where: { id: price.id },
                  data: {
                    stripePriceId: stripePrice.id,
                    unitAmount: price.unitAmount,
                    isDefault: price.isDefault,
                    paymentStyle: price.paymentStyle,
                    allocatedQuantity: price.allocatedQuantity,
                    marketplaceId: price.marketplaceId,
                  },
                });
              } else {
                // Just update our database if amount hasn't changed
                await prisma.price.update({
                  where: { id: price.id },
                  data: {
                    isDefault: price.isDefault,
                    paymentStyle: price.paymentStyle,
                    allocatedQuantity: price.allocatedQuantity,
                    marketplaceId: price.marketplaceId,
                  },
                });
              }
            }
          } else {
            // Create new price
            const stripePrice = await stripe.prices.create(
              {
                unit_amount: price.unitAmount,
                currency: price.currency.toLowerCase(),
                product: updatedProduct.stripeProductId!,
              },
              { stripeAccount: currentUser.stripeAccountId }
            );

            await prisma.price.create({
              data: {
                stripePriceId: stripePrice.id,
                unitAmount: price.unitAmount,
                currency: price.currency,
                isDefault: price.isDefault,
                paymentStyle: price.paymentStyle,
                allocatedQuantity: price.allocatedQuantity,
                marketplaceId: price.marketplaceId,
                productId: productId,
              },
            });
          }
        }

        // Handle price deletions
        const priceIdsToKeep = new Set(prices.map(p => p.id).filter(Boolean));
        const pricesToDelete = existingProduct.prices.filter(p => !priceIdsToKeep.has(p.id));

        for (const price of pricesToDelete) {
          if (price.stripePriceId !== 'pending_stripe_setup') {
            // Deactivate in Stripe
            await stripe.prices.update(
              price.stripePriceId,
              { active: false },
              { stripeAccount: currentUser.stripeAccountId }
            );
          }
          // Delete from database
          await prisma.price.delete({ where: { id: price.id } });
        }
      } catch (stripeError) {
        console.error("Stripe sync error:", stripeError);
      }
    } else {
      // No Stripe account, just update prices in database
      // Update existing prices
      for (const price of prices) {
        if (price.id) {
          await prisma.price.update({
            where: { id: price.id },
            data: {
              unitAmount: price.unitAmount,
              isDefault: price.isDefault,
              paymentStyle: price.paymentStyle,
              allocatedQuantity: price.allocatedQuantity,
              marketplaceId: price.marketplaceId,
            },
          });
        } else {
          await prisma.price.create({
            data: {
              stripePriceId: 'pending_stripe_setup',
              unitAmount: price.unitAmount,
              currency: price.currency,
              isDefault: price.isDefault,
              paymentStyle: price.paymentStyle,
              allocatedQuantity: price.allocatedQuantity,
              marketplaceId: price.marketplaceId,
              productId: productId,
            },
          });
        }
      }

      // Delete removed prices
      const priceIdsToKeep = new Set(prices.map(p => p.id).filter(Boolean));
      await prisma.price.deleteMany({
        where: {
          productId,
          id: { notIn: Array.from(priceIdsToKeep) },
        },
      });
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
