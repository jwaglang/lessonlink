import { NextRequest, NextResponse } from 'next/server';
import { callAiProvider } from '@/lib/ai/providers';
import { buildParentReportSystemPrompt, buildParentReportUserMessage } from '@/lib/ai/prompts';
import type { AssessmentReport } from '@/lib/types';

// Set to true to skip real API calls and return mock data
const USE_MOCK = process.env.AI_USE_MOCK === 'true';

// ========================================
// Mock Response (for testing without API credits)
// ========================================

function getMockParentReport(language: 'en' | 'zh' | 'pt') {
  if (language === 'zh') {
    // Mock data - real AI will generate Chinese text
    return {
      summary: '[ZH MOCK] Your child did great this unit! They completed simple English communication tasks and showed a positive attitude toward learning.',
      progressHighlights: '[ZH MOCK] Your child can now describe pictures in English and say simple sentences like "The cat is on the table." They participate actively in class.',
      suggestedActivities: '[ZH MOCK] At home, try reading English picture books together and ask your child to describe what they see. Name everyday objects in English - "apple," "chair," "window."',
    };
  }
  if (language === 'pt') {
    // Mock data - real AI will generate Portuguese text
    return {
      summary: '[PT MOCK] Your child did great this unit! They completed simple English communication tasks and showed a positive attitude toward learning.',
      progressHighlights: '[PT MOCK] Your child can now describe pictures in English and say simple sentences like "The cat is on the table." They participate actively in class.',
      suggestedActivities: '[PT MOCK] At home, try reading English picture books together and ask your child to describe what they see. Name everyday objects in English - "apple," "chair," "window."',
    };
  }
  // Default: English
  return {
    summary: 'Your child had a great session this unit! They were able to complete simple communication tasks in English and showed a very positive attitude toward learning.',
    progressHighlights: 'Your child can now describe pictures in English and say simple sentences like "The cat is on the table." They actively participate in class and are willing to try new ways of expressing themselves.',
    suggestedActivities: 'At home, try reading English picture books together and ask your child to describe what they see. You can also name everyday objects in English - "apple," "chair," "window" - to build their vocabulary in a natural way.',
  };
}

// ========================================
// POST Handler
// ========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { report, language = 'en' } = body as {
      report: AssessmentReport;
      language: 'en' | 'zh' | 'pt';
    };

    if (!report) {
      return NextResponse.json({ error: 'Missing report data' }, { status: 400 });
    }

    if (!['en', 'zh', 'pt'].includes(language)) {
      return NextResponse.json({ error: 'Invalid language. Must be en, zh, or pt.' }, { status: 400 });
    }

    // Mock mode - return fake data for testing
    if (USE_MOCK) {
      return NextResponse.json({
        success: true,
        parentReport: getMockParentReport(language),
        provider: 'mock',
        model: 'mock',
      });
    }

    // Real AI call
    const systemPrompt = buildParentReportSystemPrompt(language);
    const userMessage = buildParentReportUserMessage(report);

    const aiResponse = await callAiProvider('parent_report', [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);

    // Parse the JSON response from the AI
    let parentReport;
    try {
      // Strip any markdown fencing the AI might add despite instructions
      const cleaned = aiResponse.content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      parentReport = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse.content);
      return NextResponse.json({
        error: 'AI returned invalid JSON. Please try again.',
        rawContent: aiResponse.content,
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      parentReport,
      provider: aiResponse.provider,
      model: aiResponse.model,
      usage: aiResponse.usage,
    });

  } catch (error: any) {
    console.error('Parent report generation error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to generate parent report',
    }, { status: 500 });
  }
}

