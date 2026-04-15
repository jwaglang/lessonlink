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

Find a word that differs from "${keyword}" by only the "${targetPhoneme}" phoneme being replaced with a similar but different phoneme.
Then generate 6–10 minimal pairs that contrast these two phonemes (not just the keyword pair — varied examples).
The first pair must be the keyword vs its contrast word.

Return this exact JSON:
{
  "pairWord": "the contrasting word",
  "targetIPA": "/the target phoneme in IPA/",
  "pairIPA": "/the contrasting phoneme in IPA/",
  "minimalPairs": [
    { "word1": "keyword", "word2": "pairWord" },
    ...more pairs...
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
