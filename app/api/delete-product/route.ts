import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get('id') || '');

  if (!id) {
    return Response.json({ error: 'ID is required' }, { status: 400 });
  }
  
  try {
    await prisma.product.delete({
      where: { id },
    });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Failed to delete product' }, { status: 500 });
  }
} 