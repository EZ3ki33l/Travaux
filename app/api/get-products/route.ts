import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        room: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(Array.isArray(products) ? products : []);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json([]);
  } finally {
    await prisma.$disconnect();
  }
} 