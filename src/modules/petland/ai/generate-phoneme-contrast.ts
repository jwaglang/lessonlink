'use server';

import { callAiProvider, type AiMessage } from '@/lib/ai/providers';

export interface PhonemeContrastResult {
  pairWord: string;    // e.g. "chip"
  targetIPA: string;   // e.g. "/ʃ/"
  pairIPA: string;     // e.g. "/tʃ/"
  minimalPairs: Array<{ word1: string; word2: string }>; // 6–10 pairs contrasting the two phonemes
}

/**
 * Given a keyword and a selected target phoneme, finds a contrasting word
 * and generates 6–10 minimal pairs for that phoneme contrast.
 */
export async function generatePhonemeContrast(
  keyword: string,
  targetPhoneme: string
): Promise<PhonemeContrastResult> {
  const systemPrompt = `You are a phonetics expert creating materials for EFL learners.
Given a keyword and one of its phonemes, find a contrasting phoneme and generate minimal pairs.
Return ONLY valid JSON. No explanation, no markdown, no code fences.`;

  const userPrompt = `Keyword: "${keyword}"
Target phoneme: "${targetPhoneme}"

Step 1: Identify the IPA symbol for "${targetPhoneme}".
Step 2: Find ONE contrasting phoneme that is commonly confused with it by EFL learners. The pairWord must differ from "${keyword}" by ONLY that one phoneme substitution — all other sounds identical.
Step 3: Generate 6–8 minimal pairs. STRICT RULES:
  - Every pair must contrast EXACTLY the same two phonemes identified in steps 1–2. No other phoneme differences.
  - Both words in each pair must be real, common English words.
  - Do NOT include words where other phonemes also differ.
  - The first pair must be { "word1": "${keyword}", "word2": pairWord }.

Return this exact JSON:
{
  "pairWord": "the contrasting word",
  "targetIPA": "/the target phoneme in IPA/",
  "pairIPA": "/the contrasting phoneme in IPA/",
  "minimalPairs": [
    { "word1": "${keyword}", "word2": "pairWord" },
    ...5–7 more strictly correct pairs...
  ]
}`;

  const messages: AiMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await callAiProvider('phoneme_contrast', messages);
  const text = response.content.trim();
  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    const parsed = JSON.parse(json) as PhonemeContrastResult;
    if (!parsed.pairWord || !parsed.targetIPA || !Array.isArray(parsed.minimalPairs)) {
      throw new Error('Incomplete phoneme contrast response');
    }
    return parsed;
  } catch {
    throw new Error(`Failed to parse phoneme contrast response: ${text.slice(0, 200)}`);
  }
}
