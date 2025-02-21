import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const purchaseRequest = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!purchaseRequest) {
      return new NextResponse("Purchase request not found", { status: 404 });
    }

    // Verify that the current user is the seller of the product
    if (purchaseRequest.sellerId !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Update the purchase request status
    const updatedRequest = await prisma.purchaseRequest.update({
      where: { id },
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
