import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// For the POST request
export async function POST(req: Request) {
  // 1) Auth
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  try {
    const { name, description } = (await req.json()) as {
      name: string;
      description?: string;
    };

    if (!name) {
      return NextResponse.json(
        { error: "Marketplace name is required" },
        { status: 400 }
      );
    }

    // 2) Ensure user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // Create user if they don't exist
      await prisma.user.create({
        data: { id: userId },
      });
    }

    // 3) Create marketplace with owner and member relationships
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
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
      include: {
        owners: true,
        members: true,
      },
    });

    return NextResponse.json(marketplace);
  } catch (error) {
    console.error("POST /api/marketplaces error:", error);
    return NextResponse.json(
      { error: "Something went wrong creating the marketplace" },
      { status: 500 }
    );
  }
}

// For the GET request
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  try {
    // Find all marketplaces where user is an owner or member
    const marketplaces = await prisma.marketplace.findMany({
      where: {
        OR: [
          { owners: { some: { id: userId } } },
          { members: { some: { id: userId } } },
        ],
      },
      include: {
        owners: true,
        members: true,
      },
    });

    return NextResponse.json(marketplaces);
  } catch (error) {
    console.error("GET /api/marketplaces error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
