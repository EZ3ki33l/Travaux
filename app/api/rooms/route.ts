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

    return NextResponse.json(rooms || []);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json([]);
  } finally {
    await prisma.$disconnect();
  }
} 