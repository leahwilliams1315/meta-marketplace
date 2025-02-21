import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { PurchaseRequestCard } from "@/components/PurchaseRequestCard";

export default async function PurchaseRequestsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Get all purchase requests where the user is the seller
  const purchaseRequests = await prisma.purchaseRequest.findMany({
    where: {
      sellerId: userId,
      status: "PENDING",
    },
    include: {
      buyer: true,
      product: {
        include: {
          prices: true,
        },
      },
      price: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  }).then(requests => requests.map(request => ({
    ...request,
    product: {
      ...request.product,
      images: request.product.images as string[],
    },
  })));

  return (
    <div className="py-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#453E3E]">Purchase Requests</h1>
        <p className="text-muted-foreground mt-2">
          Review and manage purchase requests from buyers
        </p>
      </div>

      {purchaseRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-[#E5E5E5]">
          <p className="text-muted-foreground">No pending purchase requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {purchaseRequests.map((request) => (
            <PurchaseRequestCard
              key={request.id}
              request={request}
            />
          ))}
        </div>
      )}
    </div>
  );
}
