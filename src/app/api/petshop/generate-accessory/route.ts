import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
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
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
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
        console.log(`[generateAccessory] Rate limited. Waiting ${waitTime}ms...`);
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

  const accessoryPrompt = `An adorable, colorful pet accessory. ${prompt}. Kiddoland style: rounded soft shapes, warm color palette (reds, yellows, blues, greens), cute and playful design. Solid filled colors with subtle soft shading. White or light background. Centered single subject. Stylized and charming, perfect for pet shop cosmetics. Completely text-free, no letters or numbers.`;

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
    console.error('[generateAccessory] API error:', error);
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  const prediction = data?.predictions?.[0];

  if (!prediction?.bytesBase64Encoded) {
    console.error('[generateAccessory] No image in response:', JSON.stringify(data, null, 2));
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
    const bucket = storage.bucket();

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

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/vocabulary/shop/${fileName}`;

    console.log(`[generateAccessory] Image uploaded: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('[generateAccessory] Upload error:', error);
    throw new Error('Failed to upload image to storage');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, name, price, stock, collection } = body;

    if (!prompt || !name || price === undefined || !collection) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt, name, price, collection' },
        { status: 400 }
      );
    }

    console.log('[generateAccessory] Starting image generation...');

    // Generate the image
    const imageBase64 = await generateAccessoryImage(prompt);

    // Create a unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.png`;

    console.log('[generateAccessory] Uploading to storage...');

    // Upload to Firebase Storage
    const imageUrl = await uploadImageToStorage(imageBase64, fileName);

    console.log('[generateAccessory] Saving to Firestore...');

    // Save to Firestore
    const docRef = await adminDb.collection('petShopItems').add({
      name,
      description: '',
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
      imageUrl,
    });
  } catch (error) {
    console.error('[generateAccessory] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate accessory';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
