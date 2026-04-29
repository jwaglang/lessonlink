import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Missing itemId' },
        { status: 400 }
      );
    }

    console.log('[update-item-url] Getting item:', itemId);

    // Get the item from Firestore
    const itemDoc = await adminDb.collection('petShopItems').doc(itemId).get();
    if (!itemDoc.exists()) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const item = itemDoc.data();
    const currentUrl = item?.imageUrl as string;

    console.log('[update-item-url] Current URL:', currentUrl);

    if (!currentUrl) {
      return NextResponse.json(
        { error: 'Item has no image URL' },
        { status: 400 }
      );
    }

    // Extract file path from URL
    // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{filePath}?alt=media
    const filePathMatch = currentUrl.match(/\/o\/(.+?)\?/);
    
    console.log('[update-item-url] File path match:', filePathMatch);

    if (!filePathMatch) {
      return NextResponse.json(
        { error: 'Could not extract file path from URL', url: currentUrl },
        { status: 400 }
      );
    }

    const encodedPath = filePathMatch[1];
    const filePath = decodeURIComponent(encodedPath);

    console.log('[update-item-url] File path:', filePath);

    // Generate signed URL
    const app = getApps()[0];
    const storage = getStorage(app);
    const bucket = storage.bucket();
    const file = bucket.file(filePath);

    console.log('[update-item-url] Generating signed URL for:', filePath);

    const response = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days (v4 max)
    });

    const signedUrl = response[0];

    console.log('[update-item-url] Generated signed URL:', signedUrl.substring(0, 100) + '...');

    // Update Firestore
    await adminDb.collection('petShopItems').doc(itemId).update({
      imageUrl: signedUrl,
    });

    console.log('[update-item-url] Successfully updated item');

    return NextResponse.json({
      success: true,
      itemId,
      signedUrl,
      message: `Updated item with signed URL`,
    });
  } catch (error) {
    console.error('[update-item-url] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update item URL';
    const errorStack = error instanceof Error ? error.stack : '';
    return NextResponse.json(
      { error: errorMessage, details: errorStack },
      { status: 500 }
    );
  }
}
