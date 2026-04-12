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

// Helper for API calls with retry logic
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 4000;
        console.log(`[cleanupAccessory] Rate limited. Waiting ${waitTime}ms...`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
  throw new Error('Failed after retries');
}

async function removeTextFromImage(imageBase64: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const editPrompt = 'Remove all text, letters, words, numbers, labels, and written symbols from this image. Keep all the visual content, colors, shapes, and artistic elements intact. Preserve the original composition and meaning.';

  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType: 'image/png', data: imageBase64 } },
              { text: editPrompt },
            ],
          },
        ],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[cleanupAccessory] API error:', error);
    throw new Error(`Image cleaning failed: ${response.status}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts as { inlineData?: { mimeType?: string; data?: string } }[] | undefined;
  const imagePart = parts?.find((p) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    console.error('[cleanupAccessory] No image in response:', JSON.stringify(data, null, 2));
    throw new Error('No image returned from cleaning API.');
  }

  return imagePart.inlineData.data;
}

async function uploadImageToStorage(
  imageBase64: string,
  fileName: string
): Promise<string> {
  try {
    const storage = getAdminStorage();
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const bucket = storage.bucket(bucketName);

    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const file = bucket.file(`accessories/shop/${fileName}`);

    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/png',
      },
    });

    const response = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000, // 100 years
    });

    const publicUrl = response[0];
    console.log(`[cleanupAccessory] Cleaned image uploaded: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('[cleanupAccessory] Upload error:', error);
    throw new Error('Failed to upload cleaned image to storage');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Missing imageBase64' },
        { status: 400 }
      );
    }

    console.log('[cleanupAccessory] Starting text removal...');

    // Remove text from the image
    const cleanedImageBase64 = await removeTextFromImage(imageBase64);

    // Create a unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}-cleaned-${Math.random().toString(36).substring(7)}.png`;

    console.log('[cleanupAccessory] Uploading cleaned image to storage...');

    // Upload the cleaned image
    const imageUrl = await uploadImageToStorage(cleanedImageBase64, fileName);

    return NextResponse.json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    console.error('[cleanupAccessory] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clean image' },
      { status: 500 }
    );
  }
}
