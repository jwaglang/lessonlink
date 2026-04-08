'use server';

import { callAiProvider, type AiMessage } from '@/lib/ai/providers';

// Map Petland level (1-9+) to CEFR level for complexity guidance
function getLevelDescription(level: number): string {
  if (level <= 2) return 'A1 (Elementary)';
  if (level <= 4) return 'A2 (Elementary+)';
  if (level <= 6) return 'B1 (Intermediate)';
  if (level <= 8) return 'B2 (Intermediate+)';
  return 'C1 (Advanced)';
}

export async function generateSentence(word: string, level: number): Promise<string> {
  const levelDesc = getLevelDescription(level);

  const systemPrompt = `You are an English language teacher creating example sentences for vocabulary flashcards. Generate a single, clear example sentence that naturally incorporates the given word. The sentence should be appropriate for the CEFR level specified.`;

  const userPrompt = `Generate one example sentence for the word "${word}" at CEFR level ${levelDesc}.

Requirements:
- Sentence must be clear and understandable
- Word must be incorporated naturally (not awkwardly forced)
- Only output the sentence itself, no explanation or alternatives
- No special formatting or quotation marks around the word
- Suitable for young English learners

Output only the sentence.`;

  const messages: AiMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  try {
    const response = await callAiProvider('vocabulary_sentence', messages);
    return response.content.trim();
  } catch (error) {
    console.error('[generateSentence] Error:', error);
    throw new Error('Failed to generate sentence. Please try again.');
  }
}
