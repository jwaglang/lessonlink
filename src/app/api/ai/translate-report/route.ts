import { NextRequest, NextResponse } from 'next/server';
import { callAiProvider } from '@/lib/ai/providers';
import { buildTranslationPrompt } from '@/lib/ai/prompts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parentReport, targetLanguage } = body as {
      parentReport: { summary: string; progressHighlights: string; suggestedActivities: string };
      targetLanguage: 'zh' | 'pt';
    };

    if (!parentReport || !targetLanguage) {
      return NextResponse.json({ error: 'Missing parentReport or targetLanguage' }, { status: 400 });
    }

    if (!['zh', 'pt'].includes(targetLanguage)) {
      return NextResponse.json({ error: 'Invalid language. Must be zh or pt.' }, { status: 400 });
    }

    const systemPrompt = buildTranslationPrompt(targetLanguage);
    const userMessage = JSON.stringify(parentReport);

    const aiResponse = await callAiProvider('translation', [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);

    let translated;
    try {
      const cleaned = aiResponse.content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      translated = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse translation response:', aiResponse.content);
      return NextResponse.json({
        error: 'Translation returned invalid JSON. Please try again.',
        rawContent: aiResponse.content,
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      parentReport: translated,
      provider: aiResponse.provider,
      model: aiResponse.model,
      usage: aiResponse.usage,
    });
  } catch (error: any) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: error.message || 'Translation failed' }, { status: 500 });
  }
}