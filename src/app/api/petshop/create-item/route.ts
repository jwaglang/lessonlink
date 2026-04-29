import { adminDb } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { name, description, imageUrl, price, stock, collection } = body;

    if (!name || !imageUrl || price === undefined || !collection) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let storagePath: string | null = null;

    // Extract storage path from Firebase Storage URL (handles all URL formats)
    try {
      if (imageUrl.includes('/o/')) {
        const match = imageUrl.match(/\/o\/(.+?)\?/);
        if (match) storagePath = decodeURIComponent(match[1]);
      } else if (imageUrl.includes('.firebasestorage.app/')) {
        const match = imageUrl.match(/\.firebasestorage\.app\/(.+?)(?:\?|$)/);
        if (match) storagePath = match[1];
      } else if (imageUrl.includes('storage.googleapis.com')) {
        const match = imageUrl.match(/storage\.googleapis\.com\/[^/]+\/(.+?)(?:\?|$)/);
        if (match) storagePath = match[1];
      }
      if (storagePath) console.log('[create-item] Extracted storage path:', storagePath);
    } catch (error) {
      console.error('[create-item] Failed to extract path:', error);
    }

    // If we couldn't extract a path, reject the request
    if (!storagePath) {
      return NextResponse.json(
        { error: 'Invalid Firebase Storage URL - unable to extract file path' },
        { status: 400 }
      );
    }

    const docRef = await adminDb.collection('petShopItems').add({
      name,
      description: description || '',
      imageUrl,
      storagePath,
      price,
      stock: stock || 0,
      collection,
      createdDate: Date.now(),
      updatedDate: Date.now(),
    });

    return NextResponse.json({
      success: true,
      id: docRef.id,
    });
  } catch (error) {
    console.error('Error creating pet shop item:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}
