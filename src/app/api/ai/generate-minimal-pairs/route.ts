import { NextRequest, NextResponse } from 'next/server';
import { callAiProvider, type AiMessage } from '@/lib/ai/providers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, pairWord } = body as { keyword: string; pairWord: string };

    if (!keyword || !pairWord) {
      return NextResponse.json({ error: 'Missing keyword or pairWord' }, { status: 400 });
    }

    const messages: AiMessage[] = [
      {
        role: 'system',
        content: `You are a phonics specialist creating minimal pair exercises for young EFL learners (ages 5–12).
Your task is to identify the contrasting phonemes between two words, transcribe them to IPA, and generate 6–10 minimal pairs that contrast the same two phonemes.

Rules:
- Pairs must be real English words that young learners can picture or act out.
- word1 always uses the target phoneme (from the keyword); word2 uses the pair phoneme.
- Use simple, high-frequency vocabulary — avoid abstract or technical words.
- Return ONLY valid JSON. No explanation, no markdown, no code fences.`,
      },
      {
        role: 'user',
        content: `Keyword: "${keyword}"
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

Include between 6 and 10 pairs. The first pair must be the original keyword and pairWord.`,
      },
    ];

    const aiResponse = await callAiProvider('phonics_minimal_pairs', messages);
    const text = aiResponse.content.trim();
    const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    const parsed = JSON.parse(json);
    if (!parsed.targetIPA || !parsed.pairIPA || !Array.isArray(parsed.pairs) || parsed.pairs.length < 2) {
      return NextResponse.json({ error: 'Incomplete AI response' }, { status: 502 });
    }

    return NextResponse.json({ targetIPA: parsed.targetIPA, pairIPA: parsed.pairIPA, pairs: parsed.pairs });
  } catch (error: any) {
    console.error('[generate-minimal-pairs] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate minimal pairs' }, { status: 500 });
  }
}
