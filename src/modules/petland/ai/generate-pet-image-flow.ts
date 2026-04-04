'use server';

export type GeneratePetImageInput = string;
export type GeneratePetImageOutput = string;

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
