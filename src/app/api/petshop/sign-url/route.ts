import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// Helper function to get or initialize Firebase Admin Storage
function getAdminStorage() {
  let app;
  if (getApps().length > 0) {
    app = getApps()[0];
  } else {
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }
  return getStorage(app);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: 'Missing filePath parameter' },
        { status: 400 }
      );
    }

    const storage = getAdminStorage();
    const bucket = storage.bucket();
    const file = bucket.file(filePath);

    // Generate a signed URL valid for 30 days
    const response = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days (v4 max)
    });

    const signedUrl = response[0];

    return NextResponse.json({
      success: true,
      signedUrl,
    });
  } catch (error) {
    console.error('[sign-url] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to sign URL';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
