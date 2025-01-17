import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RouteContext {
  params: {
    id: string;
  };
}

export async function DELETE(
  _: Request,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const id = parseInt(params.id);
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
} 