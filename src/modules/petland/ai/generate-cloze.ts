'use server';

import { callAiProvider, type AiMessage } from '@/lib/ai/providers';

export interface ClozeResult {
  cloze: string;   // sentence with ___ marking the blank, e.g. "I ___ been here before."
  answer: string;  // the correct fill, e.g. "have"
}

/**
 * Takes the teacher's raw open cloze (role + sentence with ___ for blank)
 * and returns a polished cloze sentence + the extracted answer.
 *
 * The T enters a rough cloze like:
 *   role: "present perfect"
 *   sentence: "I ___ been waiting for an hour."
 *
 * The AI confirms/polishes the sentence is natural at the right CEFR level,
 * and extracts the answer word.
 */
export async function generateCloze(
  role: string,
  tSentence: string,
  cefrLevel: string = 'B1'
): Promise<ClozeResult> {
  const systemPrompt = `You are an EFL grammar materials writer for young learners (ages 5–12).
Your job is to take a teacher's rough open cloze sentence and return a polished version suitable for flashcard SRS practice.

Rules:
- Keep the sentence as close to the teacher's version as possible — only fix unnatural phrasing or vocabulary that is too hard.
- The blank is always written as ___ (three underscores).
- The sentence must be appropriate for CEFR ${cefrLevel}.
- Return ONLY valid JSON. No explanation, no markdown, no code fences.`;

  const userPrompt = `Grammar role: "${role}"
Teacher's cloze sentence: "${tSentence}"

Return this exact JSON structure:
{
  "cloze": "the polished sentence with ___ for the blank",
  "answer": "the single word or short phrase that fills the blank"
}`;

  const messages: AiMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await callAiProvider('grammar_cloze', messages);
  const text = response.content.trim();

  // Strip markdown code fences if present
  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    const parsed = JSON.parse(json) as ClozeResult;
    if (!parsed.cloze || !parsed.answer) {
      throw new Error('Missing cloze or answer in AI response');
    }
    return parsed;
  } catch {
    throw new Error(`Failed to parse AI cloze response: ${text.slice(0, 200)}`);
  }
}
