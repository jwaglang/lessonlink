// ========================================
// LessonLink AI Prompts
// TBLT Assessment & Report Generation
// ========================================

import type { AssessmentReport } from '@/lib/types';

// ========================================
// Assessment Analysis Prompt
// ========================================

export const ASSESSMENT_SYSTEM_PROMPT = `You are an assessment analyst for Kiddoland, a language school that follows Strong TBLT (Task-Based Language Teaching) as defined by Michael Long (2015).

Assessment principles:
- Criterion-referenced, not norm-referenced
- Task completion is the primary measure
- Language is observed as emergent from task performance, never pre-selected
- We reject "Soft TBLT" (R. Ellis, D. Nunan)
- GSE bands are mapped descriptively after observation, not as targets

Your job:
1. Analyze the teacher's notes and the learner's cited output
2. Summarize what the learner CAN DO (not what they can't)
3. Identify emergent language patterns and complexity
4. Suggest a GSE band with reasoning based on observed output
5. Suggest concrete actions for the teacher and learner
6. If this is a final assessment, compare with the initial and highlight growth

Tone: Professional but warm. Written for a teacher audience.
Never use grammar jargon with parents — describe what the child CAN DO.

You MUST respond with valid JSON only. No markdown, no backticks, no preamble. Just the JSON object.

Response format:
{
  "summary": "Brief overall assessment paragraph",
  "emergentLanguageObservations": "What linguistic resources the learner deployed",
  "suggestedGseBand": {
    "min": <number>,
    "max": <number>,
    "cefr": "<e.g. A1>",
    "cambridge": "<e.g. A1 Movers>",
    "reasoning": "Based on observed output, the learner can..."
  },
  "suggestedActions": {
    "forTeacher": ["Action 1", "Action 2"],
    "forLearner": ["Action 1", "Action 2"]
  },
  "growthSummary": "<Only for final assessments — comparison paragraph>",
  "deltaHighlights": [
    {
      "dimension": "<dimension name>",
      "initial": "<what it was>",
      "final": "<what it is now>",
      "evidence": "<cited output>"
    }
  ]
}`;

// ========================================
// Build the user message for assessment analysis
// ========================================

export function buildAssessmentUserMessage(
  report: AssessmentReport,
  initialReport?: AssessmentReport | null
): string {
  const lines: string[] = [];

  lines.push(`Assessment Type: ${report.type}`);
  lines.push(`Unit: ${report.unitId}`);
  lines.push('');

  // Scores
  lines.push('=== TBLT Scores ===');
  lines.push(`Task Completion: ${report.taskCompletion}`);
  lines.push(`Communicative Effectiveness: ${report.communicativeEffectiveness}/5`);
  lines.push(`Emergent Language Complexity: ${report.emergentLanguageComplexity}/5`);
  lines.push(`Fluency: ${report.fluency}/5`);
  lines.push('');

  // Teacher notes
  if (report.teacherNotes) {
    lines.push('=== Teacher Observations ===');
    lines.push(report.teacherNotes);
    lines.push('');
  }

  // Transcript
  if (report.transcript) {
    lines.push('=== Learner Transcript ===');
    lines.push(report.transcript);
    lines.push('');
  }

  // Citations
  if (report.outputCitations.length > 0) {
    lines.push('=== Learner Output Citations ===');
    report.outputCitations.forEach((c, i) => {
      lines.push(`${i + 1}. [${c.dimension}] "${c.quote}"${c.context ? ` — Context: ${c.context}` : ''}`);
    });
    lines.push('');
  }

  // If final assessment, include initial for comparison
  if (report.type === 'final' && initialReport) {
    lines.push('=== INITIAL ASSESSMENT (for comparison) ===');
    lines.push(`Task Completion: ${initialReport.taskCompletion}`);
    lines.push(`Communicative Effectiveness: ${initialReport.communicativeEffectiveness}/5`);
    lines.push(`Emergent Language Complexity: ${initialReport.emergentLanguageComplexity}/5`);
    lines.push(`Fluency: ${initialReport.fluency}/5`);
    if (initialReport.teacherNotes) {
      lines.push(`Teacher Notes: ${initialReport.teacherNotes}`);
    }
    if (initialReport.outputCitations.length > 0) {
      lines.push('Initial Citations:');
      initialReport.outputCitations.forEach((c, i) => {
        lines.push(`  ${i + 1}. [${c.dimension}] "${c.quote}"`);
      });
    }
    lines.push('');
    lines.push('Please compare initial and final assessments and highlight growth.');
  }

  return lines.join('\n');
}

// ========================================
// Parent Report System Prompt
// ========================================

export function buildParentReportSystemPrompt(language: 'en' | 'zh' | 'pt'): string {
  const languageNames: Record<string, string> = {
    en: 'English',
    zh: 'Chinese (Simplified)',
    pt: 'Portuguese (European)',
  };

  return `You are writing a progress report for parents/guardians of a young English language learner at Kiddoland.

Your audience: Parents who may not speak English as their first language and have no knowledge of language teaching methodology.

Rules:
- Write in ${languageNames[language]}
- NEVER use linguistic jargon (no "TBLT", "CEFR", "emergent language", "formulaic chunks", etc.)
- Focus on what the child CAN DO — be positive and encouraging
- Be specific — cite examples of things the child said or did
- Keep it warm, professional, and concise (3-4 short paragraphs max)
- Include practical suggestions for what parents can do at home

You MUST respond with valid JSON only. No markdown, no backticks, no preamble.

Response format:
{
  "summary": "What your child achieved in this unit",
  "progressHighlights": "Specific things your child can now do",
  "suggestedActivities": "What you can do at home to support learning"
}`;
}

// ========================================
// Build the user message for parent report generation
// ========================================

export function buildParentReportUserMessage(report: AssessmentReport): string {
  const lines: string[] = [];

  lines.push(`Assessment Type: ${report.type}`);
  lines.push('');

  // Scores
  lines.push('=== Assessment Scores ===');
  lines.push(`Task Completion: ${report.taskCompletion}`);
  lines.push(`Communicative Effectiveness: ${report.communicativeEffectiveness}/5`);
  lines.push(`Emergent Language Complexity: ${report.emergentLanguageComplexity}/5`);
  lines.push(`Fluency: ${report.fluency}/5`);
  lines.push('');

  // Teacher notes
  if (report.teacherNotes) {
    lines.push('=== Teacher Observations ===');
    lines.push(report.teacherNotes);
    lines.push('');
  }

  // Citations — these are the specific examples to reference in the parent report
  if (report.outputCitations.length > 0) {
    lines.push('=== Examples of What the Child Said ===');
    report.outputCitations.forEach((c, i) => {
      lines.push(`${i + 1}. "${c.quote}"${c.context ? ` (${c.context})` : ''}`);
    });
    lines.push('');
  }

  // AI analysis summary (if available) — gives richer context
  if (report.aiAnalysis?.summary) {
    lines.push('=== Expert Assessment Summary ===');
    lines.push(report.aiAnalysis.summary);
    lines.push('');
  }

  if (report.aiAnalysis?.emergentLanguageObservations) {
    lines.push('=== Language Development Observations ===');
    lines.push(report.aiAnalysis.emergentLanguageObservations);
    lines.push('');
  }

  lines.push('Please write a warm, parent-friendly progress report based on the above. Use the cited examples of what the child said to make it specific and concrete.');

  return lines.join('\n');
}
