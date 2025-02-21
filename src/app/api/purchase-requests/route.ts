import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { productId, priceId } = await req.json();

    // Validate request
    if (!productId || !priceId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the product and price
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        prices: {
          where: { id: priceId }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const price = product.prices.find(p => p.id === priceId);
    if (!price) {
      return NextResponse.json({ error: "Price not found" }, { status: 404 });
    }

    // Verify this is a REQUEST type price
    if (price.paymentStyle !== "REQUEST") {
      return NextResponse.json(
        { error: "This product does not accept purchase requests" },
        { status: 400 }
      );
    }


    // id        String                @id @default(cuid())
    // buyer     User                  @relation("BuyerRequests", fields: [buyerId], references: [id])
    // buyerId   String
    // items     Json // Stored as JSON array of cart items
    // status    PurchaseRequestStatus @default(PENDING)
    // createdAt DateTime              @default(now())
    // updatedAt DateTime              @updatedAt
  

    // Create the purchase request
    const purchaseRequest = await prisma.purchaseRequest.create({
      data: {
        buyerId: userId,
        sellerId: product.sellerId,
        productId: product.id,
        priceId: price.id,
        status: "PENDING",
      },
      include: {
        product: true,
        price: true,
        buyer: true,
        seller: true,
      },
    });

    return NextResponse.json(purchaseRequest);
  } catch (error) {
    console.error("Create purchase request error:", error);
    return NextResponse.json(
      { error: "Failed to create purchase request" },
      { status: 500 }
    );
  }
}
