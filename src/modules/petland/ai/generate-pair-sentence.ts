'use server';

import { callAiProvider, type AiMessage } from '@/lib/ai/providers';

export interface PairSentenceResult {
  sentence: string; // a natural sentence using the target word
}

/**
 * Generates a short, child-friendly sentence using one word from a minimal pair.
 * The sentence must use the word naturally and unambiguously.
 */
export async function generatePairSentence(
  targetWord: string,
  word1: string,
  word2: string
): Promise<PairSentenceResult> {
  const systemPrompt = `You are an EFL materials writer for young learners (ages 5–12).
Generate a single short, natural sentence that uses the given word clearly and unambiguously.
The sentence must make the meaning of the word obvious from context.
Use simple everyday vocabulary. Keep it under 10 words.
Return ONLY valid JSON. No explanation, no markdown, no code fences.`;

  const userPrompt = `Minimal pair: "${word1}" / "${word2}"
Use this word in a sentence: "${targetWord}"

The sentence must clearly use "${targetWord}" (not "${word1 === targetWord ? word2 : word1}").
Make the meaning obvious from context so a child can picture it.

Return:
{
  "sentence": "your sentence here"
}`;

  const messages: AiMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await callAiProvider('pair_sentence', messages);
  const text = response.content.trim();
  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    const parsed = JSON.parse(json) as PairSentenceResult;
    if (!parsed.sentence) throw new Error('No sentence in response');
    return parsed;
  } catch {
    throw new Error(`Failed to parse pair sentence response: ${text.slice(0, 200)}`);
  }
}
