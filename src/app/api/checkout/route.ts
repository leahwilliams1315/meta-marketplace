import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";

type PaymentStyle = 'INSTANT' | 'REQUEST';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  paymentStyle: PaymentStyle;
  sellerId: string;
  priceId: string;
}

type ItemsBySeller = Record<string, CartItem[]>;

interface SellerWithStripe {
  id: string;
  stripeAccountId: string | null;
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

    const body = await req.json();
    const items = body.items as CartItem[];

    if (!Array.isArray(items) || items.length === 0) {
      return new NextResponse("Items are required", { status: 400 });
    }

    // Validate cart items
    const isValidCartItem = (item: unknown): item is CartItem => {
      return typeof item === 'object' && item !== null &&
        'id' in item && typeof item.id === 'string' &&
        'name' in item && typeof item.name === 'string' &&
        'price' in item && typeof item.price === 'number' &&
        'image' in item && typeof item.image === 'string' &&
        'quantity' in item && typeof item.quantity === 'number' &&
        'paymentStyle' in item && (item.paymentStyle === 'INSTANT' || item.paymentStyle === 'REQUEST') &&
        'sellerId' in item && typeof item.sellerId === 'string' &&
        'priceId' in item && typeof item.priceId === 'string';
    };

    if (!items.every(isValidCartItem)) {
      return new NextResponse("Invalid cart items", { status: 400 });
    }

    // Check if this is a purchase request
    const isRequest = items.some(item => item.paymentStyle === 'REQUEST');

    if (isRequest) {
      // Create a purchase request in the database for each item
      const purchaseRequests = await Promise.all(
        items.map(item =>
          prisma.purchaseRequest.create({
            data: {
              buyerId: userId,
              sellerId: item.sellerId,
              productId: item.id,
              priceId: item.priceId,
              status: 'PENDING',
            },
          })
        )
      );

      // TODO: Send notification to seller about the purchase request

      return NextResponse.json({
        success: true,
        message: 'Purchase requests submitted successfully',
        requestIds: purchaseRequests.map(pr => pr.id),
      });
    } else {
      // Handle instant purchase with Stripe checkout
      // First, group items by seller
      const itemsBySeller = items.reduce<ItemsBySeller>((acc: ItemsBySeller, item: CartItem) => {
        if (!acc[item.sellerId]) {
          acc[item.sellerId] = [];
        }
        acc[item.sellerId].push(item);
        return acc;
      }, {});

      // Get seller Stripe accounts
      const sellerIds = Object.keys(itemsBySeller);
      const sellers = await prisma.user.findMany({
        where: { id: { in: sellerIds } },
        select: { id: true, stripeAccountId: true },
      }) as SellerWithStripe[];

      // Create a session for each seller
      const sessions = await Promise.all(
        sellers.map(async (seller) => {
          if (!seller.stripeAccountId) {
            throw new Error(`Seller ${seller.id} does not have a Stripe account`);
          }

          const sellerItems = itemsBySeller[seller.id];
          if (!sellerItems?.length) {
            throw new Error(`No items found for seller ${seller.id}`);
          }
          const lineItems = sellerItems.map((item: CartItem) => ({
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

          // Calculate total amount for this seller's items
          const totalAmount = sellerItems.reduce(
            (sum: number, item: CartItem) => sum + item.price * item.quantity,
            0
          );

          // Calculate platform fee (e.g., 10%)
          const platformFeePercent = 10;
          const applicationFee = Math.round(totalAmount * (platformFeePercent / 100));

          return stripe.checkout.sessions.create({
            customer_email: email,
            line_items: lineItems,
            mode: "payment",
            success_url: `${req.headers.get(
              "origin"
            )}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.get("origin")}?canceled=true`,
            payment_intent_data: {
              application_fee_amount: applicationFee,
              transfer_data: {
                destination: seller.stripeAccountId,
              },
            },
            metadata: {
              userId,
              sellerId: seller.id,
              instant: 'true',
              platformFeePercent: platformFeePercent.toString(),
            },
          });
        })
      );

      // If there's only one session, redirect to it
      // If there are multiple sessions, we might want to handle this differently
      const session = sessions[0];

      return NextResponse.json({ url: session.url });
    }
  } catch (error) {
    console.error("[CHECKOUT_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
