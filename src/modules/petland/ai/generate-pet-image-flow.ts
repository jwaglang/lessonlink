'use server';

export type GeneratePetImageInput = string;
export type GeneratePetImageOutput = string;

export async function editPetImage(petImageUrl: string, editPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

  const imageResponse = await fetch(petImageUrl);
  if (!imageResponse.ok) throw new Error(`Failed to fetch original pet image: ${imageResponse.status}`);
  const arrayBuffer = await imageResponse.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = imageResponse.headers.get('content-type') || 'image/png';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ inlineData: { mimeType, data: base64 } }, { text: editPrompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[editPetImage] API error:', error);
    throw new Error(`Image editing failed: ${response.status}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts as { inlineData?: { mimeType?: string; data?: string } }[] | undefined;
  const imagePart = parts?.find((p) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    console.error('[editPetImage] No image in response:', JSON.stringify(data, null, 2));
    throw new Error('No image returned from editing API.');
  }

  return `data:${imagePart.inlineData.mimeType ?? 'image/png'};base64,${imagePart.inlineData.data}`;
}

export async function removeTextFromImage(imageDataUri: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

  // Convert data URI to base64
  const base64Match = imageDataUri.match(/data:([^;]*);base64,(.*)/);
  if (!base64Match) throw new Error('Invalid image data URI');

  const mimeType = base64Match[1] || 'image/png';
  const base64 = base64Match[2];

  const editPrompt =
    'Remove all text, letters, words, numbers, labels, and written symbols from this image. Keep all the visual content, colors, shapes, and artistic elements intact. Preserve the original composition and meaning.';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ inlineData: { mimeType, data: base64 } }, { text: editPrompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[removeTextFromImage] API error:', error);
    throw new Error(`Image cleaning failed: ${response.status}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts as { inlineData?: { mimeType?: string; data?: string } }[] | undefined;
  const imagePart = parts?.find((p) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    console.error('[removeTextFromImage] No image in response:', JSON.stringify(data, null, 2));
    throw new Error('No image returned from cleaning API.');
  }

  return `data:${imagePart.inlineData.mimeType ?? 'image/png'};base64,${imagePart.inlineData.data}`;
}

export async function generatePetImage(wish: GeneratePetImageInput): Promise<GeneratePetImageOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

  const prompt = `Studio Ghibli-style hand-drawn animation. A single adorable monster. Every detail below must be clearly visible and accurate: ${wish}. The color, texture, and any objects or actions mentioned must be prominently featured exactly as described. Clean anatomically correct design with the proper number of limbs. Centered composition, friendly expression, suitable for a children's game. Soft natural colors, clean lines.`;

  const response = await fetch(
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

  if (!response.ok) {
    const error = await response.text();
    console.error('[generatePetImage] API error:', error);
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  const prediction = data?.predictions?.[0];

  if (!prediction?.bytesBase64Encoded) {
    console.error('[generatePetImage] No image in response:', JSON.stringify(data, null, 2));
    throw new Error('No image returned from API.');
  }

  return `data:${prediction.mimeType ?? 'image/png'};base64,${prediction.bytesBase64Encoded}`;
}

export async function generateVocabIcon(word: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

  const prompt = `A playful, colorful flashcard icon representing the concept of "${word}". Interpret the meaning and context provided. Kiddoland style: rounded soft shapes, warm color palette (reds, yellows, blues, greens), witty and expressive. Solid filled colors with subtle soft shading. White or light background. Centered single subject. Stylized and abstract with personality, not minimalist. Visually interesting for young learners. Context: This is for a vocabulary flashcard icon - the word meaning itself goes on the card elsewhere, so this image must be completely text-free. Do not include any letters, numbers, or written symbols.`;

  const response = await fetch(
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

  if (!response.ok) {
    const error = await response.text();
    console.error('[generateVocabIcon] API error:', error);
    throw new Error(`Icon generation failed: ${response.status}`);
  }

  const data = await response.json();
  const prediction = data?.predictions?.[0];

  if (!prediction?.bytesBase64Encoded) {
    console.error('[generateVocabIcon] No image in response:', JSON.stringify(data, null, 2));
    throw new Error('No image returned from API.');
  }

  const imageDataUri = `data:${prediction.mimeType ?? 'image/png'};base64,${prediction.bytesBase64Encoded}`;

  // Clean up any text that might have been generated
  try {
    const cleanedImage = await removeTextFromImage(imageDataUri);
    return cleanedImage;
  } catch (err) {
    console.warn('[generateVocabIcon] Text removal failed, returning original image:', err);
    return imageDataUri;
  }
}
