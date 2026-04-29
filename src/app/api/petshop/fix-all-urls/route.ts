import { adminDb } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

/**
 * Emergency fix endpoint: regenerates fresh URLs for all pet shop items
 * and updates them in Firestore
 */
export async function POST(request: NextRequest) {
  return fixAllUrls();
}

export async function GET(request: NextRequest) {
  return fixAllUrls();
}

async function fixAllUrls() {
  try {
    // Get all items from Firestore
    const snapshot = await adminDb.collection('petShopItems').get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`[fix-all-urls] Found ${items.length} items to fix`);

    const app = getApps()[0];
    const storage = getStorage(app);
    const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

    let fixed = 0;
    let failed = 0;

    // For each item, extract path and regenerate URL
    for (const item of items) {
      try {
        let storagePath = (item as any).storagePath || (item as any).storePath;

        // If no storagePath, try to extract from imageUrl
        if (!storagePath && typeof item.imageUrl === 'string') {
          // Try various URL formats
          if (item.imageUrl.includes('/o/')) {
            const match = item.imageUrl.match(/\/o\/(.+?)\?/);
            if (match) storagePath = decodeURIComponent(match[1]);
          } else if (item.imageUrl.includes('.firebasestorage.app/')) {
            const match = item.imageUrl.match(/\.firebasestorage\.app\/(.+?)(?:\?|$)/);
            if (match) storagePath = match[1];
          } else if (item.imageUrl.includes('storage.googleapis.com')) {
            const match = item.imageUrl.match(/storage\.googleapis\.com\/[^\/]+\/(.+?)(?:\?|$)/);
            if (match) storagePath = match[1];
          }
        }

        if (storagePath) {
          try {
            const file = bucket.file(storagePath);
            const signedUrlResponse = await file.getSignedUrl({
              version: 'v4',
              action: 'read',
              expires: Date.now() + 60 * 60 * 1000, // 1 hour
            });

            const newImageUrl = signedUrlResponse[0];

            // Update in Firestore
            await adminDb.collection('petShopItems').doc(item.id).update({
              imageUrl: newImageUrl,
              storagePath: storagePath,
              updatedDate: Date.now(),
            });

            console.log(`[fix-all-urls] ✓ Fixed "${item.name}" at ${storagePath}`);
            fixed++;
          } catch (error) {
            console.error(`[fix-all-urls] Failed to fix "${item.name}":`, error);
            failed++;
          }
        } else {
          console.warn(`[fix-all-urls] Could not extract path for "${item.name}"`);
          failed++;
        }
      } catch (error) {
        console.error(`[fix-all-urls] Error processing item:`, error);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      fixed,
      failed,
      total: items.length,
    });
  } catch (error) {
    console.error('[fix-all-urls] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fix URLs' },
      { status: 500 }
    );
  }
}
