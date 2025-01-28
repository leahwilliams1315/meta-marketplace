import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
        price: price || 0,
        images: images || [],
        sellerId: userId,
        marketplaceId,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
