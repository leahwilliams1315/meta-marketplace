import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  paymentStyle: 'INSTANT' | 'REQUEST';
}


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
      },
    });

    // Get the buyer's email from Clerk
    const buyer = await clerk.users.getUser(purchaseRequest?.buyerId || '');

    if (!purchaseRequest) {
      return new NextResponse("Purchase request not found", { status: 404 });
    }

    // Verify that the current user is the seller of at least one of the products
    // First cast to unknown, then to CartItem[] since we know the JSON structure
    const items = (purchaseRequest?.items as unknown as CartItem[]) || [];
    
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: items.map(item => item.id),
        },
      },
    });

    const isSeller = products.some((product) => product.sellerId === userId);
    if (!isSeller) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Update the purchase request status
    const updatedRequest = await prisma.purchaseRequest.update({
      where: { id: params.id },
      data: { status: "APPROVED" },
    });

    // Create a Stripe Checkout session for the approved request
    const lineItems = items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          images: [item.image],
        },
        unit_amount: item.price,
      },
      quantity: item.quantity,
    }));

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
