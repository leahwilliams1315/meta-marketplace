import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  paymentStyle: 'INSTANT' | 'REQUEST';
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get the user's email from Clerk
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;

    if (!email) {
      return new NextResponse("User email not found", { status: 400 });
    }

    const { items } = await req.json();

    if (!items || items.length === 0) {
      return new NextResponse("Items are required", { status: 400 });
    }

    // Check if this is a purchase request
    const isRequest = items.some((item: CartItem) => item.paymentStyle === 'REQUEST');

    if (isRequest) {
      // Create a purchase request in the database
      const purchaseRequest = await prisma.purchaseRequest.create({
        data: {
          buyerId: userId,
          items: items,
          status: 'PENDING',
        },
      });

      // TODO: Send notification to seller about the purchase request

      return NextResponse.json({
        success: true,
        message: 'Purchase request submitted successfully',
        requestId: purchaseRequest.id,
      });
    } else {
      // Handle instant purchase with Stripe checkout
      const lineItems = items.map((item: CartItem) => ({
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
        customer_email: email,
        line_items: lineItems,
        mode: "payment",
        success_url: `${req.headers.get(
          "origin"
        )}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get("origin")}?canceled=true`,
        metadata: {
          userId,
          instant: 'true',
        },
      });

      return NextResponse.json({ url: session.url });
    }
  } catch (error) {
    console.error("[CHECKOUT_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
