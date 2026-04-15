'use server';

import { callAiProvider, type AiMessage } from '@/lib/ai/providers';

export interface MinimalPairsResult {
  targetIPA: string;   // IPA of the keyword's target phoneme, e.g. "/r/"
  pairIPA: string;     // IPA of the pair word's contrasting phoneme, e.g. "/l/"
  pairs: Array<{ word1: string; word2: string }>; // 6–10 minimal pairs
}

/**
 * Takes a keyword and a pair word (the minimal pair seed the teacher identified),
 * transcribes the contrasting phonemes to IPA, and generates 6–10 minimal pairs
 * for Leitner drilling.
 *
 * Example:
 *   keyword: "rock", pairWord: "lock"
 *   → targetIPA: "/r/", pairIPA: "/l/"
 *   → pairs: [{word1:"rock", word2:"lock"}, {word1:"rain", word2:"lane"}, ...]
 *
 * The pairs are suitable for young EFL learners — common, concrete vocabulary.
 * word1 always contains the target phoneme; word2 always contains the pair phoneme.
 */
export async function generateMinimalPairs(
  keyword: string,
  pairWord: string
): Promise<MinimalPairsResult> {
  const systemPrompt = `You are a phonics specialist creating minimal pair exercises for young EFL learners (ages 5–12).
Your task is to identify the contrasting phonemes between two words, transcribe them to IPA, and generate 6–10 minimal pairs that contrast the same two phonemes.

Rules:
- Pairs must be real English words that young learners can picture or act out.
- word1 always uses the target phoneme (from the keyword); word2 uses the pair phoneme.
- Use simple, high-frequency vocabulary — avoid abstract or technical words.
- Return ONLY valid JSON. No explanation, no markdown, no code fences.`;

  const userPrompt = `Keyword: "${keyword}"
Pair word: "${pairWord}"

Identify the contrasting phonemes and generate minimal pairs.

Return this exact JSON structure:
{
  "targetIPA": "/phoneme/",
  "pairIPA": "/phoneme/",
  "pairs": [
    { "word1": "...", "word2": "..." },
    { "word1": "...", "word2": "..." }
  ]
}

Include between 6 and 10 pairs. The first pair must be the original keyword and pairWord.`;

  const messages: AiMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await callAiProvider('phonics_minimal_pairs', messages);
  const text = response.content.trim();

  // Strip markdown code fences if present
  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    const parsed = JSON.parse(json) as MinimalPairsResult;
    if (!parsed.targetIPA || !parsed.pairIPA || !Array.isArray(parsed.pairs) || parsed.pairs.length < 2) {
      throw new Error('Incomplete minimal pairs response from AI');
    }
    return parsed;
  } catch {
    throw new Error(`Failed to parse AI minimal pairs response: ${text.slice(0, 200)}`);
  }
}
