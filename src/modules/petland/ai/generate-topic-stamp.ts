'use server';

export async function generateTopicStamp(topic: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set.');

  const prompt =
    `A heavily used, beat-up rubber passport stamp impression — looks like it has been stamped thousands of times. ` +
    `Rectangular shape with rounded corners, double-line border, heavily worn and distressed — ink is patchy, uneven, faded in spots, with ink bleed on the edges. ` +
    `Bold uppercase text "${topic.toUpperCase()}" at the top, slightly imperfect as if stamped by hand. ` +
    `In the center: a simple icon that represents the theme "${topic}" — small, bold, stamp-style. ` +
    `The word "PETLAND" in smaller caps at the bottom. ` +
    `Extremely distressed: ink very uneven, patchy, streaky, rough grunge texture, ink splatters around edges. Looks authentically old and overused. ` +
    `Deep indigo-purple ink only. ` +
    `CRITICAL: background must be pure solid white (#FFFFFF) — no tint, no color, no gray. Only ink and white.`;

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
    const err = await response.text();
    throw new Error(`Stamp generation failed: ${response.status} — ${err}`);
  }

  const data = await response.json();
  const prediction = data?.predictions?.[0];
  if (!prediction?.bytesBase64Encoded) throw new Error('No image returned from Imagen.');

  return `data:${prediction.mimeType ?? 'image/png'};base64,${prediction.bytesBase64Encoded}`;
}
