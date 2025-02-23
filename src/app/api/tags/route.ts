import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET endpoint: Return tag suggestions based on query "suggest"
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('suggest') || '';

    // Find tags that contain the query string (case-insensitive)
    const tags = await prisma.tag.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive'
        }
      },
      take: 10
    });

    return NextResponse.json(tags);
  } catch {
    return NextResponse.json({ error: 'Error fetching tags' }, { status: 500 });
  }
}

// POST endpoint: Create a new tag
export async function POST(request: Request) {
  try {
    const reqBody = await request.json();
    const { name, createdBy } = reqBody;

    if (!name) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    // Check if a tag with the same name already exists
    const existingTag = await prisma.tag.findUnique({
      where: { name }
    });
    
    if (existingTag) {
      return NextResponse.json({ error: 'Tag already exists' }, { status: 400 });
    }

    // Create the new tag
    const tag = await prisma.tag.create({
      data: {
        name,
        createdBy
      }
    });

    return NextResponse.json(tag, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error creating tag' }, { status: 500 });
  }
}
