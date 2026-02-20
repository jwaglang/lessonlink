import { NextRequest, NextResponse } from 'next/server';
import { callAiProvider } from '@/lib/ai/providers';
import { buildSessionFeedbackSystemPrompt, buildSessionFeedbackUserMessage } from '@/lib/ai/prompts';

const USE_MOCK = process.env.AI_USE_MOCK === 'true';

function getMockFeedback() {
  return {
    summary: '[MOCK] Today we worked on describing animals using colors and sizes. Your child was enthusiastic and participated actively throughout the session.',
    progressHighlights: '[MOCK] Your child can now describe animals using 2-3 words together, like "big brown dog" and "small white cat." They also learned to ask "What color is it?" confidently.',
    suggestedActivities: '[MOCK] At home, try pointing at animals (in books, on TV, or outside) and ask your child to describe them in English. Keep it fun and playful!',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionTitle, sessionDate, teacherNotes, courseName, unitName, provider } = body as {
      sessionTitle: string;
      sessionDate: string;
      teacherNotes: string;
      courseName?: string;
      unitName?: string;
      provider?: string; // optional override: 'minimax' | 'deepseek' | 'claude'
    };

    if (!teacherNotes || !sessionTitle) {
      return NextResponse.json({ error: 'Missing teacherNotes or sessionTitle' }, { status: 400 });
    }

    if (USE_MOCK) {
      return NextResponse.json({
        success: true,
        feedback: getMockFeedback(),
        provider: 'mock',
        model: 'mock',
      });
    }

    const systemPrompt = buildSessionFeedbackSystemPrompt();
    const userMessage = buildSessionFeedbackUserMessage(sessionTitle, sessionDate, teacherNotes, courseName, unitName);

    // Use provider override if specified, otherwise use task mapping (defaults to minimax)
    const taskOrProvider = provider || 'session_feedback';

    const aiResponse = await callAiProvider(taskOrProvider, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);

    let feedback;
    try {
      const cleaned = aiResponse.content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      feedback = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', aiResponse.content);
      return NextResponse.json({
        error: 'AI returned invalid JSON. Please try again.',
        rawContent: aiResponse.content,
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      feedback,
      provider: aiResponse.provider,
      model: aiResponse.model,
      usage: aiResponse.usage,
    });
  } catch (error: any) {
    console.error('Session feedback generation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate feedback' }, { status: 500 });
  }
}
