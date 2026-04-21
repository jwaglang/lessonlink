import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

function getAdminStorage() {
  if (getApps().length > 0) return getStorage(getApps()[0]);
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return getStorage(app);
}

const EGG_PROMPT =
  'Studio Ghibli-style hand-drawn animation. A single magical dragon egg, glowing softly with warm light. ' +
  'The egg is large, smooth, and slightly translucent, with delicate swirling patterns on its surface. ' +
  'Sitting gently on a mossy surface, surrounded by soft sparkles. ' +
  'Warm, enchanting colours — cream, gold, and soft pink. ' +
  'Centered composition on a soft neutral background. No text, no words, no letters. ' +
  'Suitable for a children\'s game. Clean lines, soft natural lighting.';

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: EGG_PROMPT }],
          parameters: { sampleCount: 1 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Imagen failed: ${res.status}`, detail: err }, { status: 500 });
    }

    const data = await res.json();
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) return NextResponse.json({ error: 'No image returned' }, { status: 500 });

    // Upload to Firebase Storage
    const storage = getAdminStorage();
    const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    const file = bucket.file('petland/egg/dragon-egg.png');
    await file.save(Buffer.from(b64, 'base64'), { metadata: { contentType: 'image/png' } });

    await file.makePublic();
    const url = `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/petland/egg/dragon-egg.png`;

    return NextResponse.json({ success: true, url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
