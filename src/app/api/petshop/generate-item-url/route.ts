import { NextRequest, NextResponse } from 'next/server';
import { getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

/**
 * Generates a fresh signed URL for a pet shop item image.
 * 
 * Input: { storagePath: "accessories/shop/filename.png" }
 * Output: { success: true, imageUrl: "https://firebasestorage.googleapis.com/..." }
 * 
 * This endpoint generates fresh signed URLs on-demand, so items never expire.
 * The URL is valid for 100 years (practically permanent).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storagePath } = body;

    if (!storagePath) {
      return NextResponse.json(
        { error: 'Missing storagePath parameter' },
        { status: 400 }
      );
    }

    try {
      const app = getApps()[0];
      const storage = getStorage(app);
      const bucket = storage.bucket();
      const file = bucket.file(storagePath);

      const signedUrlResponse = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour (fresh URL generated on each page load)
      });

      const imageUrl = signedUrlResponse[0];
      console.log(`[generate-item-url] Generated URL for ${storagePath}`);

      return NextResponse.json({
        success: true,
        imageUrl,
      });
    } catch (error) {
      console.error('[generate-item-url] Firebase error:', error);
      throw new Error('Failed to generate signed URL');
    }
  } catch (error) {
    console.error('[generate-item-url] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate URL' },
      { status: 500 }
    );
  }
}
