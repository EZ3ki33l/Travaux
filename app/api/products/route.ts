import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Request data:', data);

    const { name, url, images, price, room, description, priceType } = data;

    console.log('Parsed data:', { name, url, images, price, room, description, priceType });

    // Vérifier que les données nécessaires sont présentes
    if (!name || !url || images.length === 0 || !price || !room || !priceType) {
      console.error('Missing or invalid required fields:', { name, url, images, price, room, priceType });
      return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 });
    }

    console.log('Finding room:', room);
    // Trouver la pièce existante
    let roomData = await prisma.room.findFirst({
      where: { name: room }
    });

    // Si la pièce n'existe pas, la créer
    if (!roomData) {
      console.log('Creating new room:', room);
      roomData = await prisma.room.create({
        data: { name: room }
      });
    }

    if (!roomData) {
      console.error('Failed to find or create room:', room);
      return NextResponse.json({ error: 'Failed to find or create room' }, { status: 500 });
    }

    console.log('Creating product with data:', { name, url, images, price, description, roomId: roomData.id, priceType });

    // Créer le produit
    const product = await prisma.product.create({
      data: {
        name,
        url,
        images,
        price: typeof price === 'string' ? parseFloat(price) : price,
        description,
        roomId: roomData.id,
        priceType,
      },
    });

    if (!product) {
      console.error('Failed to create product:', { name, url, images, price, description, roomId: roomData.id, priceType });
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    console.log('Product created successfully:', product);

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Error saving product:', error);
    return NextResponse.json({ error: 'Failed to save product' }, { status: 500 });
  }
} 