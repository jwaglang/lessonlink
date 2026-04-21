import { NextRequest, NextResponse } from 'next/server';
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

const PROMPT_STYLES: Record<string, (subject: string) => string> = {
  'ghibli-scene': (subject) =>
    `Studio Ghibli-style hand-drawn animation. ${subject}. ` +
    `Warm, enchanting colours, soft natural lighting, detailed and whimsical design. ` +
    `Centered composition on a soft neutral background. No text, no words, no letters. ` +
    `Suitable for a children's game. Clean lines.`,

  'pet-accessory': (subject) =>
    `Studio Ghibli-style hand-drawn animation. A whimsical pet accessory or magical item. ` +
    `Every detail below must be clearly visible and accurate: ${subject}. ` +
    `The color, texture, and any objects or materials mentioned must be prominently featured exactly as described. ` +
    `Detailed and enchanting design. Large accessory filling most of the frame, centered composition on plain white or light neutral background. ` +
    `Absolutely no text, letters, numbers, or words anywhere. No scenery or landscape. Suitable for a children's game. Soft natural colors, clean lines.`,

  'pet-character': (subject) =>
    `Studio Ghibli-style hand-drawn animation. A single adorable monster. ` +
    `Every detail below must be clearly visible and accurate: ${subject}. ` +
    `The color, texture, and any objects or actions mentioned must be prominently featured exactly as described. ` +
    `Clean anatomically correct design with the proper number of limbs. ` +
    `Centered composition, friendly expression, suitable for a children's game. Soft natural colors, clean lines.`,

  'kiddoland-vocab': (subject) =>
    `A playful, colorful flashcard icon representing the concept of "${subject}". ` +
    `Interpret the meaning and context provided. Kiddoland style: rounded soft shapes, warm color palette (reds, yellows, blues, greens), witty and expressive. ` +
    `Solid filled colors with subtle soft shading. White or light background. Centered single subject. ` +
    `Stylized and abstract with personality, not minimalist. Visually interesting for young learners. ` +
    `This is for a vocabulary flashcard icon — the word goes on the card elsewhere, so this image must be completely text-free. ` +
    `Do not include any letters, numbers, or written symbols.`,

  'phonics-flashcard': (subject) =>
    `A simple, instantly recognisable flashcard illustration for the word "${subject}". ` +
    `Show the single most common, concrete, physical meaning that a child aged 5–10 would immediately recognise. ` +
    `Single subject centred on a white background. No text, letters, or numbers anywhere. ` +
    `Kiddoland style: bold outlines, bright flat colours, friendly and simple. Suitable for a children's flashcard.`,

  custom: (subject) => subject,
};

async function generateWithImagen(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Imagen error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('No image returned from Imagen');
  return b64;
}

async function generateWithGeminiFlash(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini Flash error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts as { inlineData?: { data?: string } }[] | undefined;
  const b64 = parts?.find(p => p.inlineData?.data)?.inlineData?.data;
  if (!b64) throw new Error('No image returned from Gemini Flash');
  return b64;
}

export async function POST(request: NextRequest) {
  try {
    const { subject, promptStyle, ai } = await request.json() as {
      subject: string;
      promptStyle: string;
      ai: 'imagen' | 'gemini-flash';
    };

    if (!subject || !promptStyle || !ai) {
      return NextResponse.json({ error: 'Missing subject, promptStyle, or ai' }, { status: 400 });
    }

    const buildPrompt = PROMPT_STYLES[promptStyle] ?? PROMPT_STYLES.custom;
    const prompt = buildPrompt(subject);

    const b64 = ai === 'imagen'
      ? await generateWithImagen(prompt)
      : await generateWithGeminiFlash(prompt);

    // Upload to Firebase Storage
    const storage = getAdminStorage();
    const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    const fileName = `admin-generated/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const file = bucket.file(fileName);
    await file.save(Buffer.from(b64, 'base64'), { metadata: { contentType: 'image/png' } });
    await file.makePublic();

    const url = `https://storage.googleapis.com/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/${fileName}`;

    return NextResponse.json({ success: true, url, prompt });
  } catch (err: any) {
    console.error('[generate-image]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
