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

    // Extract storage path from Firebase Storage URL
    if (imageUrl.includes('firebasestorage.googleapis.com')) {
      try {
        // Extract file path from URL: ...o%2Fpath%2Fto%2Ffile.png?...
        const filePathMatch = imageUrl.match(/\/o\/(.+?)\?/);
        if (filePathMatch) {
          const encodedPath = filePathMatch[1];
          storagePath = decodeURIComponent(encodedPath);
          console.log('[create-item] Extracted storage path:', storagePath);
        }
      } catch (error) {
        console.error('[create-item] Failed to extract path:', error);
      }
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
