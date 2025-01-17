import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!Array.isArray(rooms)) {
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json({ data: [] });
  } finally {
    await prisma.$disconnect();
  }
} 