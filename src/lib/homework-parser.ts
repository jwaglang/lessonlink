// =========================================
// LessonLink Homework Parser
// Parses JSON exports from Kiddoland homework tools
// into a normalized ParsedHomeworkResults format.
//
// Kiddoland Export Standard v1:
// All tools export a common header:
//   kiddolandExport: true
//   exportVersion: "1.0"
//   toolType: string
//   exportDate: ISO timestamp
//   lessonTitle: string (unit title)
//   studentName: string
//   totalActivities: number
//   completedActivities: number[] or string[]
//   practiceSessions: PracticeSession[]
//   totalPracticeMinutes: number
//
// Plus tool-specific fields.
// =========================================

import type { ParsedHomeworkResults, PracticeSession, HomeworkType } from './types';

// =========================================
// Main entry point
// =========================================

export function parseHomeworkJson(
  rawJson: Record<string, any>,
  homeworkType: HomeworkType
): ParsedHomeworkResults {
  // If the JSON follows the Kiddoland Export Standard (has kiddolandExport flag),
  // use the toolType from the JSON itself to pick the parser.
  // Otherwise fall back to the homeworkType provided by the T when assigning.
  const effectiveType = rawJson.kiddolandExport
    ? (rawJson.toolType || homeworkType)
    : homeworkType;

  switch (effectiveType) {
    case 'workbook':
    case 'phonics_workbook':
      return parseWorkbookJson(rawJson);
    case 'song_worksheet':
      return parseSongWorksheetJson(rawJson);
    case 'sentence_switcher':
      return parseSentenceSwitcherJson(rawJson);
    default:
      return parseGenericJson(rawJson);
  }
}

// =========================================
// Practice session helpers
// =========================================

function extractPracticeSessions(rawJson: Record<string, any>): PracticeSession[] {
  if (Array.isArray(rawJson.practiceSessions)) {
    return rawJson.practiceSessions.map((s: any) => ({
      startTime: s.startTime || '',
      endTime: s.endTime || '',
      activeMinutes: Number(s.activeMinutes) || 0,
    }));
  }
  return [];
}

function extractTotalPracticeMinutes(rawJson: Record<string, any>): number {
  // Prefer the pre-calculated total from the export
  if (typeof rawJson.totalPracticeMinutes === 'number') {
    return rawJson.totalPracticeMinutes;
  }
  // Otherwise sum from practice sessions
  const sessions = extractPracticeSessions(rawJson);
  return sessions.reduce((sum, s) => sum + s.activeMinutes, 0);
}

// =========================================
// Workbook parser (WHITE, Phonics, future dragon levels)
// =========================================

function parseWorkbookJson(rawJson: Record<string, any>): ParsedHomeworkResults {
  const completedRaw = rawJson.completedActivities
    || rawJson.studentData?.completedActivities
    || [];
  const completed = Array.isArray(completedRaw)
    ? completedRaw.map(String)
    : [];

  const total = Number(rawJson.totalActivities) || 8; // default 8 for workbook template
  const completionRate = total > 0 ? completed.length / total : 0;

  return {
    studentName: rawJson.studentName || rawJson.studentData?.name || undefined,
    completedActivities: completed,
    totalActivities: total,
    completionRate,
    practiceSessions: extractPracticeSessions(rawJson),
    totalPracticeMinutes: extractTotalPracticeMinutes(rawJson),
    wordLevels: rawJson.wordLevels || undefined,
    dragonLevel: rawJson.dragonLevel || undefined,
  };
}

// =========================================
// Song worksheet parser
// =========================================

function parseSongWorksheetJson(rawJson: Record<string, any>): ParsedHomeworkResults {
  const completed: string[] = [];
  const total = Number(rawJson.totalActivities) || 4; // sing + match + questions + talks

  // Determine which sections the student completed
  if (rawJson.singCount && Number(rawJson.singCount) > 0) completed.push('sing_along');
  if (rawJson.matchAnswers && Object.keys(rawJson.matchAnswers).length > 0) completed.push('matching');
  if (rawJson.questionAnswers && Object.values(rawJson.questionAnswers).some((v: any) => v && String(v).trim())) completed.push('questions');
  if (rawJson.talkAnswers && Object.values(rawJson.talkAnswers).some((v: any) => v && String(v).trim())) completed.push('tiny_talks');

  const completionRate = total > 0 ? completed.length / total : 0;

  // Calculate matching score if answer key is provided
  let matchingScore: { correct: number; total: number } | undefined;
  if (rawJson.matchAnswers && rawJson.matchCorrect) {
    const keys = Object.keys(rawJson.matchCorrect);
    const correctCount = keys.filter(
      k => rawJson.matchAnswers[k] === rawJson.matchCorrect[k]
    ).length;
    matchingScore = { correct: correctCount, total: keys.length };
  }

  return {
    studentName: rawJson.studentName || undefined,
    completedActivities: completed,
    totalActivities: total,
    completionRate,
    practiceSessions: extractPracticeSessions(rawJson),
    totalPracticeMinutes: extractTotalPracticeMinutes(rawJson),
    singCount: rawJson.singCount ? Number(rawJson.singCount) : undefined,
    matchingScore,
    questionAnswers: rawJson.questionAnswers || undefined,
    talkAnswers: rawJson.talkAnswers || undefined,
  };
}

// =========================================
// Sentence switcher (grammar) parser
// =========================================

function parseSentenceSwitcherJson(rawJson: Record<string, any>): ParsedHomeworkResults {
  const missions = Array.isArray(rawJson.missions)
    ? rawJson.missions.map((m: any) => ({
        prompt: m.prompt || '',
        correctAnswer: m.correctAnswer || undefined,
        studentAnswer: m.studentAnswer || '',
      }))
    : [];

  const completedRaw = rawJson.completedActivities || [];
  const completed = Array.isArray(completedRaw) ? completedRaw.map(String) : [];
  const total = Number(rawJson.totalActivities) || missions.length;
  const completionRate = total > 0 ? completed.length / total : 0;

  return {
    studentName: rawJson.studentName || undefined,
    completedActivities: completed,
    totalActivities: total,
    completionRate,
    practiceSessions: extractPracticeSessions(rawJson),
    totalPracticeMinutes: extractTotalPracticeMinutes(rawJson),
    missions,
  };
}

// =========================================
// Generic parser (catch-all for future tool types)
// =========================================

function parseGenericJson(rawJson: Record<string, any>): ParsedHomeworkResults {
  const completedRaw = rawJson.completedActivities || [];
  const completed = Array.isArray(completedRaw) ? completedRaw.map(String) : [];
  const total = Number(rawJson.totalActivities) || 0;
  const completionRate = total > 0 ? completed.length / total : 0;

  // Strip out known common fields, store the rest as toolSpecificData
  const {
    kiddolandExport, exportVersion, toolType, exportDate,
    lessonTitle, studentName, totalActivities, completedActivities,
    practiceSessions, totalPracticeMinutes,
    ...rest
  } = rawJson;

  return {
    studentName: rawJson.studentName || undefined,
    completedActivities: completed,
    totalActivities: total,
    completionRate,
    practiceSessions: extractPracticeSessions(rawJson),
    totalPracticeMinutes: extractTotalPracticeMinutes(rawJson),
    toolSpecificData: Object.keys(rest).length > 0 ? rest : undefined,
  };
}

// =========================================
// Validation: check if a JSON object looks like a Kiddoland export
// =========================================

export function isValidKiddolandExport(rawJson: Record<string, any>): boolean {
  // Standard v1 exports have the flag
  if (rawJson.kiddolandExport === true) return true;

  // Legacy workbook exports (pre-standard) have version + lessonTitle
  if (rawJson.version && rawJson.lessonTitle) return true;

  // Legacy song worksheet exports have studentName + singCount
  if (rawJson.studentName && typeof rawJson.singCount === 'number') return true;

  return false;
}

// =========================================
// Auto-detect tool type from JSON shape
// =========================================

export function detectToolType(rawJson: Record<string, any>): HomeworkType {
  if (rawJson.toolType) return rawJson.toolType as HomeworkType;
  if (rawJson.wordLevels) return 'workbook';
  if (typeof rawJson.singCount === 'number') return 'song_worksheet';
  if (Array.isArray(rawJson.missions)) return 'sentence_switcher';
  return 'other';
}
