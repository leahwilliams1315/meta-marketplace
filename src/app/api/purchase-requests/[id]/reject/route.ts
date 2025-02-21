import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

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
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const purchaseRequest = await prisma.purchaseRequest.findUnique({
      where: { id: params.id },
    });

    if (!purchaseRequest) {
      return new NextResponse("Purchase request not found", { status: 404 });
    }

    // Verify that the current user is the seller of at least one of the products
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
      data: { status: "REJECTED" },
    });

    // TODO: Send notification to buyer about rejection

    return NextResponse.json({ 
      success: true,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("[REJECT_PURCHASE_REQUEST_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
