'use server';

import { callAiProvider, type AiMessage } from '@/lib/ai/providers';

export interface GrammarCardResult {
  wrongSentence: string;   // sentence with the error, e.g. "He has went to the store."
  correctSentence: string; // correct version, e.g. "He has gone to the store."
  errorWords: string[];    // the wrong words to highlight, e.g. ["went"]
  answer: string;          // the correct replacement, e.g. "gone"
}

/**
 * Takes a grammar rule + target verb/form and generates a Sentence Switcher card:
 * a wrong sentence (with a common learner error) and its correct version.
 */
export async function generateGrammarCard(
  rule: string,
  target: string
): Promise<GrammarCardResult> {
  const systemPrompt = `You are an EFL grammar materials writer for young learners (ages 5–12).
Given a grammar rule and a target verb/form, generate a Sentence Switcher flashcard.
A Sentence Switcher shows a sentence with a common learner error; the learner must identify and correct it.

Rules:
- Use simple, everyday vocabulary appropriate for young learners.
- The wrong sentence must contain exactly one error — the most common mistake for this grammar rule.
- The error must involve the target verb/form provided.
- Keep sentences short (under 12 words).
- errorWords is an array of the exact wrong word(s) as they appear in wrongSentence.
- answer is the correct word(s) that should replace the error.
- Return ONLY valid JSON. No explanation, no markdown, no code fences.`;

  const userPrompt = `Grammar rule: "${rule}"
Target verb/form: "${target}"

Return this exact JSON:
{
  "wrongSentence": "sentence with the grammar error",
  "correctSentence": "the corrected version of the sentence",
  "errorWords": ["the", "wrong", "words"],
  "answer": "the correct replacement"
}`;

  const messages: AiMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await callAiProvider('grammar_card', messages);
  const text = response.content.trim();
  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    const parsed = JSON.parse(json) as GrammarCardResult;
    if (!parsed.wrongSentence || !parsed.correctSentence || !parsed.answer) {
      throw new Error('Incomplete grammar card response');
    }
    if (!Array.isArray(parsed.errorWords)) parsed.errorWords = [];
    return parsed;
  } catch {
    throw new Error(`Failed to parse grammar card response: ${text.slice(0, 200)}`);
  }
}
