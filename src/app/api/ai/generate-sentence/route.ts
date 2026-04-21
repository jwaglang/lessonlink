import { NextRequest, NextResponse } from 'next/server';
import { callAiProvider, type AiMessage } from '@/lib/ai/providers';

function getLevelDescription(level: number): string {
  if (level <= 2) return 'A1 (Elementary)';
  if (level <= 4) return 'A2 (Elementary+)';
  if (level <= 6) return 'B1 (Intermediate)';
  if (level <= 8) return 'B2 (Intermediate+)';
  return 'C1 (Advanced)';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word, level } = body as { word: string; level: number };

    if (!word || typeof level !== 'number') {
      return NextResponse.json({ error: 'Missing word or level' }, { status: 400 });
    }

    const levelDesc = getLevelDescription(level);

    const messages: AiMessage[] = [
      {
        role: 'system',
        content: 'You are an English language teacher creating example sentences for vocabulary flashcards. Generate a single, clear example sentence that naturally incorporates the given word. The sentence should be appropriate for the CEFR level specified.',
      },
      {
        role: 'user',
        content: `Generate one example sentence for the word "${word}" at CEFR level ${levelDesc}.

Requirements:
- Sentence must be clear and understandable
- Word must be incorporated naturally (not awkwardly forced)
- Only output the sentence itself, no explanation or alternatives
- No special formatting or quotation marks around the word
- Suitable for young English learners

Output only the sentence.`,
      },
    ];

    const aiResponse = await callAiProvider('vocabulary_sentence', messages);

    return NextResponse.json({ sentence: aiResponse.content.trim(), provider: aiResponse.provider });
  } catch (error: any) {
    console.error('[generate-sentence] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate sentence' }, { status: 500 });
  }
}
