import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log('Fetching products from database...');
    const products = await prisma.product.findMany({
      include: {
        room: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log('Products fetched:', products);

    if (!Array.isArray(products)) {
      console.error('Products is not an array:', products);
      return NextResponse.json({ error: 'Invalid data format' }, { status: 500 });
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 