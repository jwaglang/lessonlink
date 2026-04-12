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

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 4000;
        console.log(`[generatePreview] Rate limited. Waiting ${waitTime}ms...`);
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

async function generateAccessoryImage(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const accessoryPrompt = `Studio Ghibli-style hand-drawn animation. A whimsical pet accessory or magical item. Every detail below must be clearly visible and accurate: ${prompt}. The color, texture, and any objects or materials mentioned must be prominently featured exactly as described. Detailed and enchanting design. Centered composition, suitable for a children's game. Soft natural colors, clean lines.`;

  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: accessoryPrompt }],
        parameters: { sampleCount: 1 },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[generatePreview] API error:', error);
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  const prediction = data?.predictions?.[0];

  if (!prediction?.bytesBase64Encoded) {
    console.error('[generatePreview] No image in response:', JSON.stringify(data, null, 2));
    throw new Error('No image returned from API');
  }

  return prediction.bytesBase64Encoded;
}

async function uploadImageToStorage(
  imageBase64: string,
  fileName: string
): Promise<string> {
  try {
    const storage = getAdminStorage();
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const bucket = storage.bucket(bucketName);

    // Convert base64 to Buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Create a file reference
    const file = bucket.file(`vocabulary/shop/${fileName}`);

    // Upload the file
    await file.save(imageBuffer, {
      metadata: {
        contentType: 'image/png',
      },
    });

    // Get the signed download URL (valid for 1 hour)
    const response = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    const publicUrl = response[0];
    console.log(`[generatePreview] Image uploaded: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('[generatePreview] Upload error:', error);
    throw new Error('Failed to upload image to storage');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      );
    }

    console.log('[generatePreview] Starting image generation...');

    // Generate the image
    const imageBase64 = await generateAccessoryImage(prompt);

    // Create a unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.png`;

    console.log('[generatePreview] Uploading to storage...');

    // Upload to Firebase Storage
    const imageUrl = await uploadImageToStorage(imageBase64, fileName);

    return NextResponse.json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    console.error('[generatePreview] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
