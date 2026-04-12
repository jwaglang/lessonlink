import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

export async function POST(request: NextRequest) {
  try {
    console.log('[fix-unsigned-urls] Starting...');
    const apps = getApps();
    console.log('[fix-unsigned-urls] Apps count:', apps.length);
    
    if (apps.length === 0) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const app = apps[0];
    console.log('[fix-unsigned-urls] Using app:', app.name);
    
    const storage = getStorage(app);
    console.log('[fix-unsigned-urls] Storage bucket:', process.env.FIREBASE_STORAGE_BUCKET);
    const bucket = storage.bucket();
    
    // Get all pet shop items
    const snapshot = await adminDb.collection('petShopItems').get();
    
    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        fixed: 0,
        message: 'No items found',
      });
    }

    let fixedCount = 0;
    const updates: Promise<void>[] = [];

    snapshot.forEach((doc) => {
      const item = doc.data();
      const imageUrl = item.imageUrl as string;

      // Check if URL is missing the signed token
      if (imageUrl && !imageUrl.includes('&token=')) {
        // Try to extract file path from URL
        // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{filePath}?alt=media
        const filePathMatch = imageUrl.match(/\/o\/(.+?)\?/);
        
        if (filePathMatch) {
          const encodedPath = filePathMatch[1]; // e.g., "vocabulary%2Fshop%2F2148449f.png"
          const filePath = decodeURIComponent(encodedPath); // e.g., "vocabulary/shop/2148449f.png"
          
          // Generate signed URL
          updates.push(
            bucket
              .file(filePath)
              .getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
              })
              .then((response) => {
                const signedUrl = response[0];
                // Update Firestore
                return adminDb.collection('petShopItems').doc(doc.id).update({
                  imageUrl: signedUrl,
                });
              })
              .then(() => {
                fixedCount++;
              })
              .catch((error) => {
                console.error(`Failed to fix ${filePath}:`, error);
              })
          );
        }
      }
    });

    // Wait for all updates to complete
    await Promise.all(updates);

    return NextResponse.json({
      success: true,
      fixed: fixedCount,
      message: `Fixed ${fixedCount} item(s) with unsigned URLs`,
    });
  } catch (error) {
    console.error('[fix-unsigned-urls] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fix URLs';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
