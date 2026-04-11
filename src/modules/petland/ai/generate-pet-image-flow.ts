'use server';

import retry from 'async-retry';

export type GeneratePetImageInput = string;
export type GeneratePetImageOutput = string;

// Helper function to add delay between API calls
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Wrapper for API calls with retry logic for rate limiting
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2
): Promise<Response> {
  return retry(
    async () => {
      console.log(`[fetchWithRetry] Attempting API call...`);
      const response = await fetch(url, options);
      
      // Log the full response for debugging
      console.log(`[fetchWithRetry] Response status: ${response.status}`);
      
      // Handle rate limiting with exponential backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 4000;
        const errorBody = await response.text();
        console.log(`[fetchWithRetry] 429 Rate Limited. Error body:`, errorBody);
        console.log(`[fetchWithRetry] Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
        throw new Error(`Rate limited. Retry after ${waitTime}ms`);
      }
      
      return response;
    },
    {
      retries: maxRetries,
      minTimeout: 3000,
      maxTimeout: 8000,
      randomize: true,
      factor: 1.5,
    }
  );
}

export async function editPetImage(petImageUrl: string, editPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

  const imageResponse = await fetch(petImageUrl);
  if (!imageResponse.ok) throw new Error(`Failed to fetch original pet image: ${imageResponse.status}`);
  const arrayBuffer = await imageResponse.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = imageResponse.headers.get('content-type') || 'image/png';

  const response = await fetchWithRetry(
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

  const response = await fetchWithRetry(
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

  const response = await fetchWithRetry(
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

export async function composeAccessoryOnPet(
  petImageUrl: string,
  accessoryImageUrl: string,
  mergePrompt: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

  // Fetch pet image
  const petResponse = await fetch(petImageUrl);
  if (!petResponse.ok) throw new Error(`Failed to fetch pet image: ${petResponse.status}`);
  const petArrayBuffer = await petResponse.arrayBuffer();
  const petBase64 = Buffer.from(petArrayBuffer).toString('base64');
  const petMimeType = petResponse.headers.get('content-type') || 'image/png';

  // Fetch accessory image
  const accessoryResponse = await fetch(accessoryImageUrl);
  if (!accessoryResponse.ok) throw new Error(`Failed to fetch accessory image: ${accessoryResponse.status}`);
  const accessoryArrayBuffer = await accessoryResponse.arrayBuffer();
  const accessoryBase64 = Buffer.from(accessoryArrayBuffer).toString('base64');
  const accessoryMimeType = accessoryResponse.headers.get('content-type') || 'image/png';

  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType: petMimeType, data: petBase64 } },
              { inlineData: { mimeType: accessoryMimeType, data: accessoryBase64 } },
              { text: mergePrompt },
            ],
          },
        ],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[composeAccessoryOnPet] API error:', error);
    throw new Error(`Accessory composition failed: ${response.status}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts as { inlineData?: { mimeType?: string; data?: string } }[] | undefined;
  const imagePart = parts?.find((p) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    console.error('[composeAccessoryOnPet] No image in response:', JSON.stringify(data, null, 2));
    throw new Error('No composite image returned from API.');
  }

  return `data:${imagePart.inlineData.mimeType ?? 'image/png'};base64,${imagePart.inlineData.data}`;
}

export async function generateVocabIcon(word: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

  const prompt = `A playful, colorful flashcard icon representing the concept of "${word}". Interpret the meaning and context provided. Kiddoland style: rounded soft shapes, warm color palette (reds, yellows, blues, greens), witty and expressive. Solid filled colors with subtle soft shading. White or light background. Centered single subject. Stylized and abstract with personality, not minimalist. Visually interesting for young learners. Context: This is for a vocabulary flashcard icon - the word meaning itself goes on the card elsewhere, so this image must be completely text-free. Do not include any letters, numbers, or written symbols.`;

  const response = await fetchWithRetry(
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

  // Skip text removal for now - the prompt already asks for text-free images
  return imageDataUri;
}
