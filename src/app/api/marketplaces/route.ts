import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, description } = await req.json();
    const slug = name.toLowerCase().replace(/\s+/g, "-");

    const marketplace = await prisma.marketplace.create({
      data: {
        name,
        description,
        slug,
        owners: {
          connect: { id: userId },
        },
        members: {
          connect: { id: userId },
        },
      },
    });

    return NextResponse.json(marketplace);
  } catch (error) {
    console.error("Create marketplace error:", error);
    return NextResponse.json(
      { error: "Failed to create marketplace" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const marketplaces = await prisma.marketplace.findMany({
      where: {
        OR: [
          { owners: { some: { id: userId } } },
          { members: { some: { id: userId } } },
        ],
      },
      include: {
        owners: true,
        _count: {
          select: {
            products: true,
            members: true,
          },
        },
      },
    });

    return NextResponse.json(marketplaces);
  } catch (error) {
    console.error("List marketplaces error:", error);
    return NextResponse.json(
      { error: "Failed to list marketplaces" },
      { status: 500 }
    );
  }
}
