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
  const systemPrompt = `You are an expert EFL grammar materials writer for young learners (ages 5–12).
Your job is to create a Sentence Switcher flashcard: one sentence containing a single grammar error that the learner must find and fix.

STRICT RULES — follow every one exactly:
1. The ONLY error in wrongSentence is a wrong form of the target verb/form. Everything else (vocabulary, spelling, punctuation, word order, time expressions) must be grammatically correct and compatible with the grammar rule.
2. Choose a time expression or context that is NATURAL for the grammar rule. For example: Present Perfect → use "already / just / ever / never / yet / since / for", NOT "yesterday / last week / ago" (those belong to Past Simple).
3. Keep sentences short (8–10 words max) and use everyday vocabulary a child would know.
4. errorWords must be ONLY the exact wrong word(s) from wrongSentence that need to be replaced — not auxiliary verbs that are correct.
5. answer is the correct replacement word(s) for errorWords.
6. wrongSentence and correctSentence differ ONLY in errorWords being swapped for answer.
7. Return ONLY valid JSON. No explanation, no markdown, no code fences.`;

  const userPrompt = `Grammar rule: "${rule}"
Target verb/form: "${target}"

Think step by step:
1. What is the most common learner error with this rule + target?
2. What time expression or context is grammatically compatible with ${rule}?
3. Write wrongSentence using only the wrong form — everything else correct.
4. Write correctSentence fixing only the error.

Return this exact JSON:
{
  "wrongSentence": "sentence with only the one grammar error",
  "correctSentence": "the corrected sentence (identical except the error is fixed)",
  "errorWords": ["exact wrong word(s) from wrongSentence"],
  "answer": "the correct replacement word(s)"
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
