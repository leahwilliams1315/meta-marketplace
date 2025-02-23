import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { productId: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  try {
    const { productId } = params;

    const productTags = await prisma.productTag.findMany({
      where: { productId },
      include: {
        tag: true,
      },
    });

    // Transform to the format expected by the MultipleSelector
    const formattedTags = productTags.map(pt => ({
      value: pt.tag.id.toString(),
      label: pt.tag.name,
    }));

    return NextResponse.json(formattedTags);
  } catch (error) {
    console.error("Get product tags error:", error);
    return NextResponse.json(
      { error: "Failed to get product tags" },
      { status: 500 }
    );
  }
}
