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

    // If the imageUrl looks like an unsigned Firebase Storage URL, sign it
    if (imageUrl.includes('firebasestorage.googleapis.com') && !imageUrl.includes('&token=')) {
      try {
        // Extract file path from URL
        const filePathMatch = imageUrl.match(/\/o\/(.+?)\?/);
        if (filePathMatch) {
          const encodedPath = filePathMatch[1];
          const filePath = decodeURIComponent(encodedPath);
          
          // Generate signed URL
          const app = getApps()[0];
          const storage = getStorage(app);
          const bucket = storage.bucket();
          const file = bucket.file(filePath);
          
          const response = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
          });
          
          imageUrl = response[0];
          console.log('[create-item] Auto-signed URL:', imageUrl.substring(0, 100) + '...');
        }
      } catch (error) {
        console.error('[create-item] Failed to auto-sign URL:', error);
        // Continue with original URL - might work anyway
      }
    }

    const docRef = await adminDb.collection('petShopItems').add({
      name,
      description: description || '',
      imageUrl,
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
