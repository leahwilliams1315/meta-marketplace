import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ marketplaceId: string }> }
) {
  try {
    const { userId } = await auth();
    const { marketplaceId } = await params;
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const marketplace = await prisma.marketplace.findUnique({
      where: { id: marketplaceId },
      include: {
        members: true,
        owners: true,
      },
    });

    if (!marketplace) {
      return new NextResponse("Marketplace not found", { status: 404 });
    }

    // Check if user is already a member or owner
    const isMember = marketplace.members.some((member) => member.id === userId);
    const isOwner = marketplace.owners.some((owner) => owner.id === userId);

    if (isMember || isOwner) {
      return new NextResponse("Already a member", { status: 400 });
    }

    // Add user as a member
    await prisma.marketplace.update({
      where: { id: marketplaceId },
      data: {
        members: {
          connect: { id: userId },
        },
      },
    });

    return new NextResponse("Joined marketplace", { status: 200 });
  } catch (error) {
    console.error("[MARKETPLACE_JOIN]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ marketplaceId: string }> }
) {
  try {
    const { userId } = await auth();
    const { marketplaceId } = await params;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const marketplace = await prisma.marketplace.findUnique({
      where: { id: marketplaceId },
      include: {
        members: true,
        owners: true,
      },
    });

    if (!marketplace) {
      return new NextResponse("Marketplace not found", { status: 404 });
    }

    // Check if user is an owner
    const isOwner = marketplace.owners.some((owner) => owner.id === userId);
    if (isOwner) {
      return new NextResponse("Owners cannot leave", { status: 400 });
    }

    // Check if user is a member
    const isMember = marketplace.members.some((member) => member.id === userId);
    if (!isMember) {
      return new NextResponse("Not a member", { status: 400 });
    }

    // Remove user from members
    await prisma.marketplace.update({
      where: { id: marketplaceId },
      data: {
        members: {
          disconnect: { id: userId },
        },
      },
    });

    return new NextResponse("Left marketplace", { status: 200 });
  } catch (error) {
    console.error("[MARKETPLACE_LEAVE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
