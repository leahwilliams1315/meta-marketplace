import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    const clerk = await clerkClient();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const purchaseRequest = await prisma.purchaseRequest.findUnique({
      where: { id: params.id },
      include: {
        buyer: true,
        product: true,
        price: true,
      },
    });

    if (!purchaseRequest) {
      return new NextResponse("Purchase request not found", { status: 404 });
    }

    // Get the buyer's email from Clerk
    const buyer = await clerk.users.getUser(purchaseRequest.buyerId);

    // Verify that the current user is the seller
    if (purchaseRequest.sellerId !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Update the purchase request status
    const updatedRequest = await prisma.purchaseRequest.update({
      where: { id: params.id },
      data: { status: "APPROVED" },
    });

    // Create a Stripe Checkout session for the approved request
    const lineItems = [{
      price_data: {
        currency: "usd",
        product_data: {
          name: purchaseRequest.product.name,
          images: purchaseRequest.product.images as string[],
        },
        unit_amount: purchaseRequest.price.unitAmount,
      },
      quantity: 1,
    }];

    const session = await stripe.checkout.sessions.create({
      customer_email: buyer.emailAddresses[0].emailAddress,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get(
        "origin"
      )}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}?canceled=true`,
      metadata: {
        userId: purchaseRequest.buyerId,
        purchaseRequestId: purchaseRequest.id,
      },
    });

    return NextResponse.json({ 
      success: true, 
      checkoutUrl: session.url,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("[APPROVE_PURCHASE_REQUEST_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
