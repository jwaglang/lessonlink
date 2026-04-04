'use server';

import { ai } from '../ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';

const GeneratePetImageInputSchema = z.string();
export type GeneratePetImageInput = z.infer<typeof GeneratePetImageInputSchema>;

const GeneratePetImageOutputSchema = z.string();
export type GeneratePetImageOutput = z.infer<typeof GeneratePetImageOutputSchema>;

export async function generatePetImage(
  wish: GeneratePetImageInput
): Promise<GeneratePetImageOutput> {
  return generatePetImageFlow(wish);
}

const generatePetImageFlow = ai.defineFlow(
  {
    name: 'generatePetImageFlow',
    inputSchema: GeneratePetImageInputSchema,
    outputSchema: GeneratePetImageOutputSchema,
  },
  async (wish) => {
    const prompt = `A single, adorable, cartoon monster in a Studio Ghibli-style animation. The monster is inspired by the following description: "${wish}". The monster should be centered, have a friendly expression, and be suitable for a children's game. Style: high-quality digital art, vibrant colors, clean lines.`;

    const result = await ai.generate({
      model: googleAI.model('imagen-4.0-fast-generate-001'),
      prompt,
    });

    if (!result.media?.url) {
      console.error('Image generation failed. Full API response:', JSON.stringify(result, null, 2));
      throw new Error('Image generation failed. No media URL returned.');
    }

    return result.media.url;
  }
);
