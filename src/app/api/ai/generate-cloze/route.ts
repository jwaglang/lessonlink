import { NextRequest, NextResponse } from 'next/server';
import { callAiProvider, type AiMessage } from '@/lib/ai/providers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { role, tSentence, cefrLevel = 'B1' } = body as { role: string; tSentence: string; cefrLevel?: string };

    if (!role || !tSentence) {
      return NextResponse.json({ error: 'Missing role or tSentence' }, { status: 400 });
    }

    const messages: AiMessage[] = [
      {
        role: 'system',
        content: `You are an EFL grammar materials writer for young learners (ages 5–12).
Your job is to take a teacher's rough open cloze sentence and return a polished version suitable for flashcard SRS practice.

Rules:
- Keep the sentence as close to the teacher's version as possible — only fix unnatural phrasing or vocabulary that is too hard.
- The blank is always written as ___ (three underscores).
- The sentence must be appropriate for CEFR ${cefrLevel}.
- Return ONLY valid JSON. No explanation, no markdown, no code fences.`,
      },
      {
        role: 'user',
        content: `Grammar role: "${role}"
Teacher's cloze sentence: "${tSentence}"

Return this exact JSON structure:
{
  "cloze": "the polished sentence with ___ for the blank",
  "answer": "the single word or short phrase that fills the blank"
}`,
      },
    ];

    const aiResponse = await callAiProvider('grammar_cloze', messages);
    const text = aiResponse.content.trim();
    const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    const parsed = JSON.parse(json);
    if (!parsed.cloze || !parsed.answer) {
      return NextResponse.json({ error: 'Incomplete AI response' }, { status: 502 });
    }

    return NextResponse.json({ cloze: parsed.cloze, answer: parsed.answer });
  } catch (error: any) {
    console.error('[generate-cloze] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate cloze' }, { status: 500 });
  }
}
