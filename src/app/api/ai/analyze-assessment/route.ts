import { NextRequest, NextResponse } from 'next/server';
import { callAiProvider } from '@/lib/ai/providers';
import { ASSESSMENT_SYSTEM_PROMPT, buildAssessmentUserMessage } from '@/lib/ai/prompts';
import type { AssessmentReport } from '@/lib/types';

// Set to true to skip real API calls and return mock data
const USE_MOCK = process.env.AI_USE_MOCK === 'true';

// ========================================
// Mock Response (for testing without API credits)
// ========================================

function getMockResponse(report: AssessmentReport) {
  return {
    summary: `The learner demonstrated ${report.taskCompletion === 'achieved' ? 'strong' : 'developing'} communicative ability during this ${report.type} assessment. They engaged meaningfully with the task and showed willingness to communicate despite some limitations in their current linguistic repertoire.`,
    emergentLanguageObservations: 'The learner is beginning to use multi-word phrases and simple sentence structures. Evidence of formulaic chunks being deployed appropriately in context. Some creative language use observed when familiar patterns were extended to new situations.',
    suggestedGseBand: {
      min: 22,
      max: 28,
      cefr: 'A1',
      cambridge: 'A1 Movers',
      reasoning: 'Based on observed output, the learner can produce simple phrases and participate in basic communicative exchanges. Their language use is consistent with early A1 descriptors on the GSE scale.',
    },
    suggestedActions: {
      forTeacher: [
        'Introduce tasks that require slightly more displacement (talking about past events)',
        'Provide more opportunities for extended turns in pair/group tasks',
      ],
      forLearner: [
        'Practice describing pictures and telling simple stories at home',
        'Use Petland vocabulary games to build confidence with new words',
      ],
    },
    ...(report.type === 'final' ? {
      growthSummary: 'Comparing initial and final assessments, the learner shows clear progress in communicative effectiveness and fluency. They are now able to sustain longer exchanges and deploy a wider range of vocabulary.',
      deltaHighlights: [
        {
          dimension: 'communicative_effectiveness',
          initial: 'Relied heavily on single words and gestures',
          final: 'Can now convey meaning through short phrases',
          evidence: 'See cited output examples',
        },
      ],
    } : {}),
  };
}

// ========================================
// POST Handler
// ========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { report, initialReport } = body as {
      report: AssessmentReport;
      initialReport?: AssessmentReport | null;
    };

    if (!report) {
      return NextResponse.json({ error: 'Missing report data' }, { status: 400 });
    }

    // Mock mode — return fake data for testing
    if (USE_MOCK) {
      return NextResponse.json({
        success: true,
        analysis: getMockResponse(report),
        provider: 'mock',
        model: 'mock',
      });
    }

    // Real AI call
    const userMessage = buildAssessmentUserMessage(report, initialReport);
    const aiResponse = await callAiProvider('assessment_analysis', [
      { role: 'system', content: ASSESSMENT_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ]);

    // Parse the JSON response from the AI
    let analysis;
    try {
      // Strip any markdown fencing the AI might add despite instructions
      const cleaned = aiResponse.content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      analysis = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse.content);
      return NextResponse.json({
        error: 'AI returned invalid JSON. Please try again.',
        rawContent: aiResponse.content,
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      analysis,
      provider: aiResponse.provider,
      model: aiResponse.model,
      usage: aiResponse.usage,
    });

  } catch (error: any) {
    console.error('Assessment analysis error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to analyze assessment',
    }, { status: 500 });
  }
}
