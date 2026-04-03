# LessonLink: Curriculum-Building & AI Architecture Spec

**Date:** March 23, 2026 (Q35)
**Status:** Spec ready, not started
**Dependencies:** Phase 15-B Homework System ✅ (data foundation + UI complete)
**Blocks:** Homework system usefulness in practice, AI-powered feedback (Phase 14/16), future adaptive features

---

## 1. Goal

Transform LessonLink from a session-management tool into a curriculum-building platform where reusable homework templates live on units, AI generates content descriptions on demand, and a T-side AI advisor synthesizes all learner data to recommend next steps. The curriculum grows over time as T adds and refines templates — every future L benefits.

**This spec covers five interconnected systems:**

1. **Homework Templates** — reusable assignment definitions on units
2. **AI Integration Layer** — provider-agnostic abstraction (Claude, DeepSeek, MiniMax, Qwen, OpenAI-compatible)
3. **AI Content Generation** — unit descriptions and homework descriptions generated on demand
4. **AI Advisor** — T-facing agent that recommends actions per L based on all available data
5. **Vocabulary Mastery Tracker** — word-level tracking from homework JSON feeding into the advisor

---

## 2. Architecture Overview

### The Curriculum Tree (Current → New)

**Current structure:**
```
Course → Level → Unit → Sessions
                         ↓
              homeworkAssignments (per-student, created fresh each time)
```

**New structure:**
```
Course → Level → Unit → Sessions
                   ↓
           homeworkTemplates (reusable, AI-generated descriptions)
                   ↓
           homeworkAssignments (per-student, references templateId)
```

### How It Works in Practice

1. T creates a unit (or already has one)
2. T clicks "Add Homework Template" on the unit
3. T fills in the basics: title, type (workbook/worksheet/etc.), optional notes
4. T clicks "Generate with AI" — LL calls the AI provider to generate a description, learning aims, and objectives
5. T reviews, edits if needed, approves
6. Template is saved on the unit — visible to all future Ls
7. When T wants to assign homework to a specific L, they pick from the unit's template library
8. T optionally adds `teacherInstructions` (per-L custom note) and sends
9. The `homeworkAssignment` doc is created with a `templateId` reference back to the template

### Curriculum Completeness

Each unit shows a completeness indicator: "2 of 4 recommended homework templates created." The recommended count is based on the unit's session count (one template per session is the baseline). T is free to exceed or fall short — this is guidance, not enforcement.

---

## 3. Data Model

### 3a. `homeworkTemplates` Collection (NEW)

```typescript
interface HomeworkTemplate {
  id: string;

  // Curriculum position
  courseId: string;
  levelId: string;
  unitId: string;
  teacherId: string;               // T who created this template

  // Content
  title: string;                   // e.g. "Colors and Shapes Workbook"
  homeworkType: HomeworkType;       // 'workbook' | 'phonics_workbook' | 'song_worksheet' | 'sentence_switcher' | 'other'
  description: string;             // What this homework covers (AI-generated, T-edited)
  aims: string[];                  // Learning aims (AI-generated, T-edited)
  objectives: string[];            // Measurable objectives (AI-generated, T-edited)
  estimatedMinutes?: number;       // How long L should spend
  toolTemplateUrl?: string;        // URL/path to the Kiddoland HTML template file

  // AI Generation metadata
  aiGenerated: boolean;            // Was description AI-generated?
  aiProvider?: string;             // Which provider generated it (e.g. 'deepseek', 'claude')
  aiModel?: string;                // Which model (e.g. 'deepseek-chat', 'claude-sonnet-4-20250514')
  aiGeneratedAt?: string;          // ISO timestamp
  aiPromptVersion?: string;        // Version of the prompt template used (for reproducibility)

  // Status
  status: 'draft' | 'approved';   // T must approve before template appears in assign flow
  approvedAt?: string;

  // Ordering
  sortOrder: number;               // Position within the unit's template list

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Usage stats (denormalized for quick display)
  timesAssigned: number;           // How many times this template has been used across all Ls
  averageScore?: number;           // Average grading score across all assignments from this template
}
```

### 3b. Changes to `HomeworkAssignment` (EXISTING — add fields)

```typescript
// Add to existing HomeworkAssignment interface
{
  // ... existing fields stay ...

  // NEW: Template reference
  templateId?: string;             // Reference to homeworkTemplates doc (optional — legacy assignments won't have this)

  // EXISTING (already built, now populated from template):
  // teacherInstructions?: string; // Per-L custom note (already exists in type, form input not built yet)
}
```

### 3c. `vocabularyMastery` Collection (NEW)

Tracks word-level mastery per L, fed by homework JSON uploads.

```typescript
interface VocabularyMasteryRecord {
  id: string;                      // `${studentId}_${word}` compound key

  // Links
  studentId: string;
  courseId: string;

  // Word data
  word: string;                    // The vocabulary item (lowercase, trimmed)
  currentLevel: number;            // Current mastery level (1-5 scale, derived from latest homework)
  exposureCount: number;           // How many times this word has appeared across homework
  correctCount: number;            // How many times L got it right
  incorrectCount: number;          // How many times L got it wrong

  // History (last 5 encounters for trend)
  history: VocabularyEncounter[];

  // Spaced repetition signals
  lastSeenAt: string;              // ISO timestamp of most recent homework containing this word
  needsReview: boolean;            // True if currentLevel < 3 OR last seen > 14 days ago

  // Metadata
  createdAt: string;
  updatedAt: string;
}

interface VocabularyEncounter {
  homeworkAssignmentId: string;
  date: string;                    // ISO timestamp
  level: number;                   // Mastery level at that point (from wordLevels in JSON)
  source: string;                  // Which homework template this came from
}
```

### 3d. `aiProviderConfig` (stored in admin settings or `platformConfig` collection)

```typescript
interface AIProviderConfig {
  // Global default (admin-set)
  defaultProvider: AIProviderName;
  defaultModel: string;

  // Provider credentials (from environment variables)
  // Keys are NOT stored in Firestore — they live in env vars
  // This config just records which provider/model to use

  // Per-provider model preferences
  providerModels: {
    claude: string;                // e.g. 'claude-sonnet-4-20250514'
    deepseek: string;              // e.g. 'deepseek-chat'
    minimax: string;               // e.g. 'MiniMax-Text-01'
    qwen: string;                  // e.g. 'qwen-max'
    openai_compatible: string;     // e.g. 'gpt-4o' or any model string
  };

  // OpenAI-compatible endpoint (for generic providers)
  openaiCompatibleBaseUrl?: string; // e.g. 'https://api.groq.com/openai/v1'
}

type AIProviderName = 'claude' | 'deepseek' | 'minimax' | 'qwen' | 'openai_compatible';
```

### 3e. T-level AI override (stored in `userSettings` or `teacherProfiles`)

```typescript
// Add to existing teacher settings
{
  // ... existing fields ...

  // NEW: AI provider override
  aiOverride?: {
    provider: AIProviderName;
    model: string;
    apiKey: string;                // Encrypted — T's own key
    baseUrl?: string;              // For openai_compatible only
  };
}
```

---

## 4. AI Integration Layer

### 4a. Design Principle: Provider-Agnostic Interface

Every AI feature in LL (unit descriptions, HW descriptions, assessment analysis, advisor) calls through the same abstraction. The caller defines **what** it needs. The layer handles **how** based on the configured provider.

```
Caller (e.g. "generate HW description")
  → AIService.complete(prompt, options)
    → resolveProvider(teacherId)    // Check T override → fall back to admin default
      → ProviderAdapter.chat(messages, config)
        → HTTP call to Claude / DeepSeek / MiniMax / Qwen / OpenAI-compatible
      ← Raw response
    ← Parsed, structured response
  ← Typed output to caller
```

### 4b. Shared Interface

```typescript
// src/lib/ai/types.ts

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AICompletionOptions {
  messages: AIMessage[];
  temperature?: number;            // Default 0.7
  maxTokens?: number;              // Default 2000
  responseFormat?: 'text' | 'json'; // If 'json', adapter adds format instructions per provider
}

interface AICompletionResult {
  content: string;                 // Raw text response
  provider: AIProviderName;
  model: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
  costEstimate?: number;           // Estimated cost in USD (optional, for monitoring)
}

interface AIProviderAdapter {
  name: AIProviderName;
  chat(options: AICompletionOptions): Promise<AICompletionResult>;
}
```

### 4c. Provider Adapters

Each adapter normalizes the provider's API to the shared interface.

**Claude** (`src/lib/ai/providers/claude.ts`)
- Uses `@anthropic-ai/sdk` or direct HTTP to `https://api.anthropic.com/v1/messages`
- Maps `AIMessage` → Anthropic message format (system prompt separate from messages)
- Handles `responseFormat: 'json'` via system prompt instruction

**DeepSeek** (`src/lib/ai/providers/deepseek.ts`)
- Uses OpenAI-compatible format → `https://api.deepseek.com/v1/chat/completions`
- Maps `AIMessage` → OpenAI message format
- Handles `responseFormat: 'json'` via `response_format: { type: 'json_object' }`

**MiniMax** (`src/lib/ai/providers/minimax.ts`)
- Uses MiniMax API format → `https://api.minimax.chat/v1/text/chatcompletion_v2`
- Maps `AIMessage` → MiniMax message format
- Note: MiniMax API format differs from OpenAI — needs its own adapter

**Qwen** (`src/lib/ai/providers/qwen.ts`)
- Uses OpenAI-compatible format → `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
- Maps `AIMessage` → OpenAI message format

**OpenAI-Compatible Generic** (`src/lib/ai/providers/openai-compatible.ts`)
- Configurable `baseUrl` — works with Groq, Together, Mistral, Ollama, etc.
- Standard OpenAI chat completions format
- Fallback adapter for any future provider

### 4d. Provider Resolution

```typescript
// src/lib/ai/resolve-provider.ts

async function resolveProvider(teacherId?: string): Promise<{
  provider: AIProviderName;
  model: string;
  apiKey: string;
  baseUrl?: string;
}> {
  // 1. Check T override (if teacherId provided)
  if (teacherId) {
    const teacherSettings = await getTeacherSettings(teacherId);
    if (teacherSettings?.aiOverride?.apiKey) {
      return {
        provider: teacherSettings.aiOverride.provider,
        model: teacherSettings.aiOverride.model,
        apiKey: teacherSettings.aiOverride.apiKey,  // Decrypted
        baseUrl: teacherSettings.aiOverride.baseUrl,
      };
    }
  }

  // 2. Fall back to admin default (from platform config)
  const config = await getAIProviderConfig();
  return {
    provider: config.defaultProvider,
    model: config.providerModels[config.defaultProvider],
    apiKey: getEnvApiKey(config.defaultProvider),  // From environment variable
    baseUrl: config.defaultProvider === 'openai_compatible'
      ? config.openaiCompatibleBaseUrl
      : undefined,
  };
}

function getEnvApiKey(provider: AIProviderName): string {
  const envMap: Record<AIProviderName, string> = {
    claude: 'ANTHROPIC_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY',
    minimax: 'MINIMAX_API_KEY',
    qwen: 'QWEN_API_KEY',
    openai_compatible: 'OPENAI_COMPATIBLE_API_KEY',
  };
  return process.env[envMap[provider]] || '';
}
```

### 4e. Environment Variables

```
# AI Provider Keys (admin-managed, server-side only)
ANTHROPIC_API_KEY=sk-ant-xxx
DEEPSEEK_API_KEY=sk-xxx
MINIMAX_API_KEY=xxx
QWEN_API_KEY=sk-xxx
OPENAI_COMPATIBLE_API_KEY=sk-xxx
```

### 4f. Cost Monitoring

Every AI call logs: provider, model, input/output tokens, estimated cost, caller context (which feature triggered it). This lets admin track spend per provider and per feature. Stored as a simple `aiUsageLog` collection or a flat log file — lightweight, no UI needed initially.

```typescript
interface AIUsageLogEntry {
  id: string;
  timestamp: string;
  provider: AIProviderName;
  model: string;
  feature: 'unit_description' | 'homework_description' | 'assessment_analysis' | 'advisor' | 'session_feedback';
  teacherId: string;
  studentId?: string;              // If the call was about a specific L
  inputTokens: number;
  outputTokens: number;
  costEstimateUsd: number;         // Rough estimate based on known pricing
  durationMs: number;              // How long the call took
}
```

---

## 5. AI Content Generation

### 5a. Unit Description Generation

**When:** T clicks "Generate with AI" on a unit that has a title but no description yet (or T wants to regenerate).

**Input to AI:**
```typescript
{
  courseTitle: string;              // e.g. "Fun Phonics"
  levelName: string;               // e.g. "WHITE — Beginner"
  unitTitle: string;               // e.g. "Colors and Shapes"
  bigQuestion: string;             // e.g. "Why do we see colors differently?"
  sessionTitles: string[];         // e.g. ["Primary Colors", "Mixing Colors", ...]
  sessionLittleQuestions: string[]; // e.g. ["What are the 3 main colors?", ...]
  existingDescription?: string;    // If regenerating, include current description for refinement
}
```

**System Prompt:**
```
You are a curriculum description writer for Kiddoland, a language school
that follows Strong TBLT (Task-Based Language Teaching, Michael Long 2015).

Write a unit description for teachers and parents that:
- Explains what the unit covers in accessible, jargon-free language
- Highlights the Big Question as a driving inquiry
- Lists 3-4 learning aims (what the L will be able to DO, not grammar points)
- Lists 3-5 measurable objectives
- Keeps the tone professional but warm
- Never mentions grammar rules, tenses, or linguistic terminology to parents
- For the teacher version, can reference TBLT task types

Respond in JSON format:
{
  "description": "2-3 paragraph unit overview",
  "aims": ["aim 1", "aim 2", "aim 3"],
  "objectives": ["objective 1", "objective 2", "objective 3"]
}
```

**Output:** Parsed JSON → pre-fills the unit's description, aims, and objectives fields. T reviews and edits in the UI before approving.

### 5b. Homework Description Generation

**When:** T clicks "Generate with AI" on a homework template that has a title and type but no description.

**Input to AI:**
```typescript
{
  // Unit context
  courseTitle: string;
  levelName: string;
  unitTitle: string;
  bigQuestion: string;
  unitDescription: string;         // The approved unit description

  // Template specifics
  homeworkTitle: string;           // e.g. "Colors and Shapes Workbook"
  homeworkType: HomeworkType;       // e.g. 'workbook'
  teacherNotes?: string;           // Any notes T added when creating the template

  // What other templates exist on this unit (for context / avoid duplication)
  existingTemplates: Array<{
    title: string;
    type: HomeworkType;
    description: string;
  }>;
}
```

**System Prompt:**
```
You are a homework description writer for Kiddoland, a language school
following Strong TBLT (Michael Long 2015).

Write a homework template description that:
- Explains what the homework covers and what the L will practice
- Lists 2-3 specific learning aims tied to the unit's Big Question
- Lists 2-4 measurable objectives (observable outcomes, not grammar)
- Specifies what the L will need (e.g. "the Colors workbook HTML file")
- Estimates completion time
- Avoids duplicating what other templates on this unit already cover
- Tone: clear instructions a parent can understand

Homework type context:
- workbook: Interactive HTML workbook with multiple vocabulary activities
- phonics_workbook: Phonics-focused workbook with sound recognition activities
- song_worksheet: Song-based worksheet with matching, questions, tiny talks
- sentence_switcher: Sentence building and manipulation exercises
- other: Custom homework

Respond in JSON format:
{
  "description": "2-3 paragraph homework overview",
  "aims": ["aim 1", "aim 2"],
  "objectives": ["objective 1", "objective 2", "objective 3"],
  "estimatedMinutes": 20
}
```

### 5c. Session Feedback Generation (Stacked — uses same AI layer)

Already specced in Phase 15/16 but not built. When built, it will use the same `AIService.complete()` interface with a session-feedback-specific prompt. No additional spec needed here — just noting it shares the infrastructure.

### 5d. Assessment Analysis Generation (Stacked — uses same AI layer)

Already specced in Phase 14. When built, it will use the same `AIService.complete()` interface. The Phase 14 spec's "AI System Prompt" section applies directly. No changes needed — just confirming it plugs into this layer.

---

## 6. AI Advisor

### 6a. What It Is

A T-facing AI agent that synthesizes all available data about a specific L and provides actionable recommendations. T accesses it from the L's profile page. It is not a chatbot — it produces a structured advisory report that T can regenerate on demand.

### 6b. When T Uses It

**Entry point:** L profile page → new "AI Advisor" button (or tab)

**Triggers:**
- T wants to plan the next session and needs guidance
- T is deciding whether to move L to the next unit or repeat
- T wants to understand L's strengths and weaknesses across multiple data points
- T is choosing which homework to assign and wants a recommendation

### 6c. Data Ingestion

The advisor receives ALL available data for this L. The system assembles the context automatically — T just clicks the button.

```typescript
interface AdvisorContext {
  // L profile
  student: {
    name: string;
    level: string;                 // Current level (e.g. "WHITE")
    enrolledSince: string;
    totalHours: number;
  };

  // Current unit progress
  currentUnit: {
    title: string;
    bigQuestion: string;
    sessionsCompleted: number;
    totalSessions: number;
    unitDescription: string;
  };

  // Session history (last 5-10 sessions)
  recentSessions: Array<{
    date: string;
    unitTitle: string;
    sessionTitle: string;
    duration: number;
    // Session feedback if it exists
    feedback?: {
      summary: string;
      progressHighlights: string;
      suggestedActivities: string;
    };
    // T notes if entered
    teacherNotes?: string;
  }>;

  // Homework history (all for current unit + last unit)
  homeworkHistory: Array<{
    templateTitle: string;
    templateType: HomeworkType;
    status: HomeworkStatus;
    score?: number;
    practiceMinutes?: number;
    completionRate?: number;
    gradingNotes?: string;
  }>;

  // Assessment data (if exists)
  assessments: Array<{
    type: 'initial' | 'final';
    unitTitle: string;
    taskCompletion: string;
    communicativeEffectiveness: number;
    emergentLanguageComplexity: number;
    fluency: number;
    aiSummary?: string;
    suggestedActions?: {
      forTeacher: string[];
      forLearner: string[];
    };
  }>;

  // Vocabulary mastery (top struggles + top strengths)
  vocabularySnapshot: {
    totalWordsTracked: number;
    wordsNeedingReview: number;     // needsReview === true
    strongestWords: Array<{ word: string; level: number }>;   // Top 5
    weakestWords: Array<{ word: string; level: number }>;     // Bottom 5
    recentlyLearned: Array<{ word: string; level: number }>;  // Level jumped in last 2 weeks
  };

  // Available homework templates for current unit (for recommendation)
  availableTemplates: Array<{
    id: string;
    title: string;
    type: HomeworkType;
    description: string;
    alreadyAssignedToThisStudent: boolean;
    averageScoreAcrossStudents?: number;
  }>;

  // Practice time (from Kiddoland JSON exports)
  practiceTimeSummary: {
    totalMinutesThisUnit: number;
    totalMinutesAllTime: number;
    averageMinutesPerHomework: number;
  };
}
```

### 6d. System Prompt

```
You are a teaching advisor for Kiddoland, an online English language school
that follows Strong TBLT (Task-Based Language Teaching, Michael Long 2015).

Your role is to help the teacher make informed decisions about a specific
learner. You are advising a professional teacher — be specific, actionable,
and evidence-based. Never be vague or generic.

Assessment principles (TBLT):
- Criterion-referenced, not norm-referenced
- Task completion is the primary measure
- Language is observed as emergent from task performance, never pre-selected
- We reject "Soft TBLT" (R. Ellis, D. Nunan)

Your output must include:

1. LEARNER SNAPSHOT
   A 2-3 sentence summary of where this learner is right now.
   Cite specific evidence (scores, T notes, vocabulary data).

2. STRENGTHS
   What is this learner doing well? Cite homework scores, assessment
   dimensions, or T observations.

3. AREAS FOR GROWTH
   Where does this learner need support? Be specific — cite vocabulary
   gaps, low scores on specific homework types, or assessment dimensions.

4. NEXT SESSION RECOMMENDATION
   What should the teacher focus on in the next session? Be concrete:
   suggest specific activities, task types, or focus areas.

5. HOMEWORK RECOMMENDATION
   From the available templates, recommend which one(s) to assign next
   and explain why. Flag any templates this learner has already completed.
   If no templates are a good fit, say so.

6. UNIT PROGRESSION ADVICE
   Should this learner continue in the current unit, repeat sessions,
   or is ready to move to the next unit? Base this on evidence.

7. VOCABULARY FOCUS
   Which specific words need review? Which are strong and can be
   built upon? Reference the vocabulary mastery data.

Tone: Professional, direct, evidence-based. You are talking to a teacher,
not a parent. Use TBLT terminology where helpful but don't be academic.

Respond in JSON format:
{
  "learnerSnapshot": "...",
  "strengths": ["...", "..."],
  "areasForGrowth": ["...", "..."],
  "nextSessionRecommendation": "...",
  "homeworkRecommendation": {
    "suggestedTemplateIds": ["id1", "id2"],
    "reasoning": "...",
    "completedTemplateIds": ["id3"]
  },
  "unitProgressionAdvice": "...",
  "vocabularyFocus": {
    "reviewWords": ["word1", "word2"],
    "strongWords": ["word3", "word4"],
    "suggestion": "..."
  }
}
```

### 6e. Output Display

The advisor output renders as a structured card on the L profile page:

- **Learner Snapshot** — top summary card
- **Strengths / Growth Areas** — two-column layout
- **Next Session** — highlighted recommendation box
- **Homework Recommendation** — shows suggested templates with "Assign" buttons inline (T can assign directly from the advisor output)
- **Unit Progression** — progress indicator with AI's recommendation
- **Vocabulary Focus** — word chips color-coded by mastery level

T can click "Regenerate" to get fresh advice (new AI call). Each generation is logged for cost tracking.

### 6f. Advisor Limitations (Be Honest With T)

The advisor UI should include a small footer note: "This advice is based on available data. The more feedback, homework scores, and notes you enter, the better the recommendations become." This sets expectations — if T hasn't entered session feedback for 3 weeks, the advisor's advice will be shallow.

---

## 7. Vocabulary Mastery Tracker

### 7a. How Words Enter the System

When T (or L) uploads homework JSON and the homework type is `workbook` or `phonics_workbook`, the parser extracts `wordLevels` — a map of words to mastery scores. This is the existing parser behavior from Phase 15-B.

**New step after parsing:** After `parsedResults` is saved on the `homeworkAssignment`, a function updates the `vocabularyMastery` collection:

```typescript
async function updateVocabularyMastery(
  studentId: string,
  courseId: string,
  homeworkAssignmentId: string,
  wordLevels: Record<string, number>,  // From parsed homework JSON
  templateTitle: string
): Promise<void> {
  for (const [word, level] of Object.entries(wordLevels)) {
    const docId = `${studentId}_${word.toLowerCase().trim()}`;
    const existing = await getVocabularyMasteryRecord(docId);

    if (existing) {
      // Update existing record
      await updateVocabularyMasteryRecord(docId, {
        currentLevel: level,
        exposureCount: existing.exposureCount + 1,
        correctCount: existing.correctCount + (level >= 3 ? 1 : 0),
        incorrectCount: existing.incorrectCount + (level < 3 ? 1 : 0),
        history: [
          ...existing.history.slice(-4),  // Keep last 4 + new = 5 total
          {
            homeworkAssignmentId,
            date: new Date().toISOString(),
            level,
            source: templateTitle,
          }
        ],
        lastSeenAt: new Date().toISOString(),
        needsReview: level < 3 || daysSince(existing.lastSeenAt) > 14,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Create new record
      await createVocabularyMasteryRecord({
        id: docId,
        studentId,
        courseId,
        word: word.toLowerCase().trim(),
        currentLevel: level,
        exposureCount: 1,
        correctCount: level >= 3 ? 1 : 0,
        incorrectCount: level < 3 ? 1 : 0,
        history: [{
          homeworkAssignmentId,
          date: new Date().toISOString(),
          level,
          source: templateTitle,
        }],
        lastSeenAt: new Date().toISOString(),
        needsReview: level < 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }
}
```

### 7b. Mastery Levels

The workbook templates use a 1-5 scale for word mastery. We preserve this scale:

| Level | Meaning | Color | needsReview? |
|-------|---------|-------|-------------|
| 1 | First exposure / not recognized | Red | Yes |
| 2 | Recognized but not produced | Orange | Yes |
| 3 | Produced with support | Amber | No (unless stale) |
| 4 | Produced independently | Green | No |
| 5 | Mastered / automatic | Blue | No |

**Staleness rule:** Any word not seen in 14+ days has `needsReview` set to `true` regardless of level. This is the lightweight spaced repetition signal — not a full algorithm, but enough for the advisor to say "these words haven't been practiced recently."

### 7c. Vocabulary Dashboard (T-Portal)

**Location:** L profile → Homework tab (or new sub-tab under Progress)

**View:**
- Total words tracked, words needing review count
- Word cloud or sorted list, color-coded by mastery level
- Filterable by: needs review / strong / all
- Clickable words show history (when first seen, score trend across homework)
- "Words to Review" section feeds directly into advisor recommendations

This is a display-only feature — T doesn't edit vocabulary data manually.

### 7d. How Vocabulary Data Feeds the Advisor

When the advisor is triggered, the system queries `vocabularyMastery` for the L:
- Top 5 strongest words (highest `currentLevel`)
- Top 5 weakest words (lowest `currentLevel` where `exposureCount >= 2`)
- Words needing review (`needsReview === true`)
- Recently learned words (where `currentLevel` increased in the last 14 days)

This snapshot is included in the `AdvisorContext.vocabularySnapshot` field (see Section 6c).

---

## 8. Curriculum Completeness Indicator

### 8a. How It Works

Each unit displays a completeness badge based on how many homework templates exist vs. the recommended count.

**Recommended count formula:** `unit.totalSessions` (one template per session is the baseline expectation). A 4-session WHITE unit recommends 4 templates. A 5-session ORANGE unit recommends 5.

**Display:**
```
Unit: Colors and Shapes
Sessions: 4 | Homework Templates: 2/4
[██████░░░░░░] 50% coverage
```

**Color coding:**
- 0% = Gray (no templates yet)
- 1-49% = Amber (getting started)
- 50-99% = Blue (good progress)
- 100%+ = Green (fully covered — T can exceed the recommended count)

### 8b. Where It Appears

1. **T-portal unit list** — badge on each unit card
2. **T-portal unit detail** — in the homework templates section header
3. **Course Page** (when built) — in the curriculum accordion under each unit
4. **AI Advisor** — advisor mentions if the current unit has low template coverage ("Consider adding more homework templates to this unit — only 1 of 4 recommended templates exist")

### 8c. Data Source

Not a stored field — calculated on the fly from:
- `sessions` collection filtered by `unitId` → count = recommended
- `homeworkTemplates` collection filtered by `unitId` + `status: 'approved'` → count = actual

---

## 9. T-Portal UI Flows

### 9a. Homework Template Management

**Location:** T-portal → Unit detail page (or a new "Curriculum" section)

**View: Template List on Unit**
```
┌─────────────────────────────────────────────┐
│ Unit: Colors and Shapes                     │
│ Templates: 2/4 recommended  [+ Add Template]│
├─────────────────────────────────────────────┤
│ ✅ Colors and Shapes Workbook    | workbook │
│    Approved · Assigned 3 times · Avg: 82%   │
│    [Edit] [View]                            │
├─────────────────────────────────────────────┤
│ ✅ Colors Song Worksheet      | song_worksheet│
│    Approved · Assigned 1 time · Avg: 91%    │
│    [Edit] [View]                            │
├─────────────────────────────────────────────┤
│ 📝 Shapes Sentence Switcher  | sentence_switcher│
│    Draft · Not yet approved                 │
│    [Edit] [Generate with AI] [Approve]      │
└─────────────────────────────────────────────┘
```

**Flow: Add New Template**
1. T clicks "+ Add Template"
2. Form appears: title, homework type (dropdown), optional notes
3. T fills in basics, clicks "Save Draft"
4. Template created with `status: 'draft'`
5. T clicks "Generate with AI" — system calls AI provider with unit context
6. AI response pre-fills description, aims, objectives, estimated time
7. T reviews, edits if needed
8. T clicks "Approve" — status changes to `approved`
9. Template now appears in the assign flow for all Ls on this unit

**Flow: Edit Existing Template**
1. T clicks "Edit" on a template
2. All fields editable (title, type, description, aims, objectives, time)
3. T can click "Regenerate with AI" to get a fresh description
4. Save updates the template — does NOT affect already-assigned homework (those reference the template but don't sync)

### 9b. Assigning Homework from Templates

**Location:** Same entry points as current assign flow (calendar dialog, sessions tab, homework tab) — but now the form starts with template selection.

**Updated Assign Flow:**
1. T clicks "Assign Homework"
2. **NEW: Template picker** — dropdown or card list showing approved templates for this L's current unit
   - Each template shows: title, type, description preview, times assigned, avg score
   - Templates already assigned to this L are flagged: "✓ Already assigned (Feb 20)"
   - Option at bottom: "Custom (no template)" for one-off assignments
3. T selects a template
4. Form pre-fills: title, description, type (all from template, read-only)
5. T adds: `teacherInstructions` (free text — per-L custom note), due date, delivery method
6. T clicks "Assign"
7. `homeworkAssignment` created with `templateId` reference
8. Template's `timesAssigned` counter incremented

### 9c. AI Advisor UI

**Location:** L profile page → "AI Advisor" button in the header area (or as a dedicated tab)

**Flow:**
1. T clicks "AI Advisor"
2. Loading state: "Gathering learner data..." → "Generating recommendations..."
3. System assembles `AdvisorContext` from all collections
4. System calls AI provider with the advisor prompt
5. Response renders as structured cards (see Section 6e)
6. "Assign" buttons on recommended templates let T assign directly
7. "Regenerate" button at bottom for fresh advice
8. Small footer: "Advice quality improves with more data. Enter session feedback and grade homework regularly."

### 9d. Admin AI Settings

**Location:** Admin panel → new "AI Settings" section

**View:**
```
┌─────────────────────────────────────────────┐
│ AI Provider Settings                        │
├─────────────────────────────────────────────┤
│ Default Provider: [DeepSeek ▼]              │
│ Model: [deepseek-chat           ]           │
│                                             │
│ Provider Models:                            │
│   Claude:     [claude-sonnet-4-20250514  ]  │
│   DeepSeek:   [deepseek-chat             ]  │
│   MiniMax:    [MiniMax-Text-01           ]  │
│   Qwen:       [qwen-max                 ]  │
│   OAI-Compat: [gpt-4o                   ]  │
│                                             │
│ OAI-Compatible Base URL:                    │
│   [https://api.groq.com/openai/v1       ]   │
│                                             │
│ API Keys: Managed via environment variables │
│ (.env.local on Netlify)                     │
│                                             │
│ [Save Settings]                             │
├─────────────────────────────────────────────┤
│ Usage This Month:                           │
│   Total calls: 47                           │
│   Total tokens: ~125,000                    │
│   Est. cost: $0.18                          │
│   By feature:                               │
│     HW descriptions: 23 calls              │
│     Unit descriptions: 8 calls             │
│     Advisor: 16 calls                      │
└─────────────────────────────────────────────┘
```

### 9e. T-Portal AI Override Settings

**Location:** T-portal → Settings → new "AI" section

**View:**
```
┌─────────────────────────────────────────────┐
│ AI Provider (Optional Override)             │
│                                             │
│ Use your own AI provider instead of the     │
│ platform default.                           │
│                                             │
│ Provider: [Claude ▼]                        │
│ Model: [claude-sonnet-4-20250514      ]     │
│ API Key: [sk-ant-•••••••••••••        ]     │
│ Base URL: [                           ]     │
│ (Base URL only needed for OAI-Compatible)   │
│                                             │
│ [Save] [Remove Override]                    │
│                                             │
│ Currently using: DeepSeek (platform default)│
└─────────────────────────────────────────────┘
```

---

## 10. Firestore Rules Updates

```
// homeworkTemplates
match /homeworkTemplates/{templateId} {
  allow read: if request.auth != null;
  allow create, update: if request.auth != null
    && request.auth.uid == resource.data.teacherId;
  allow delete: if request.auth != null
    && request.auth.uid == resource.data.teacherId;
}

// vocabularyMastery
match /vocabularyMastery/{recordId} {
  allow read: if request.auth != null;
  allow create, update: if request.auth != null;
  // No manual delete — system-managed
}

// aiUsageLog (admin-read-only, system-write)
match /aiUsageLog/{logId} {
  allow read: if request.auth != null
    && request.auth.token.email == 'jwag.lang@gmail.com';
  allow create: if request.auth != null;
}
```

---

## 11. Firestore Indexes Needed

```
// homeworkTemplates by unit (for template list)
Collection: homeworkTemplates
Fields: unitId (Asc), status (Asc), sortOrder (Asc)

// homeworkTemplates by course (for curriculum overview)
Collection: homeworkTemplates
Fields: courseId (Asc), status (Asc)

// vocabularyMastery by student (for advisor + dashboard)
Collection: vocabularyMastery
Fields: studentId (Asc), needsReview (Asc), currentLevel (Asc)

// vocabularyMastery by student + course
Collection: vocabularyMastery
Fields: studentId (Asc), courseId (Asc), currentLevel (Asc)

// aiUsageLog by date (for admin usage view)
Collection: aiUsageLog
Fields: timestamp (Desc)

// aiUsageLog by feature (for per-feature cost breakdown)
Collection: aiUsageLog
Fields: feature (Asc), timestamp (Desc)
```

---

## 12. API Routes

### 12a. AI Completion Route

**Route:** `POST /api/ai/complete`

**Purpose:** Single endpoint for all AI features. Caller specifies the feature, the route assembles the prompt and calls the provider.

**Request body:**
```typescript
{
  feature: 'unit_description' | 'homework_description' | 'advisor' | 'assessment_analysis' | 'session_feedback';
  context: Record<string, any>;    // Feature-specific context (unit data, L data, etc.)
  teacherId: string;               // For provider resolution
}
```

**Logic:**
1. Resolve provider (T override → admin default)
2. Build prompt from feature + context (using the prompt templates in Section 5/6)
3. Call provider adapter
4. Parse response (expect JSON, handle text fallback)
5. Log usage to `aiUsageLog`
6. Return structured response

**Note:** This route runs server-side and has access to env vars (API keys). It does NOT use the client Firebase SDK — it uses the admin SDK or direct Firestore REST calls. This avoids the permission issue we hit with the homework API routes.

### 12b. Homework Template CRUD

**These use client-side Firestore calls** (same pattern as the assign form fix). No API routes needed — the T-portal calls Firestore directly with the logged-in user's auth token.

```typescript
// Client-side functions in src/lib/firestore.ts
createHomeworkTemplate(data: Omit<HomeworkTemplate, 'id'>): Promise<string>
getHomeworkTemplate(id: string): Promise<HomeworkTemplate | null>
updateHomeworkTemplate(id: string, data: Partial<HomeworkTemplate>): Promise<void>
deleteHomeworkTemplate(id: string): Promise<void>
getHomeworkTemplatesByUnit(unitId: string): Promise<HomeworkTemplate[]>
getHomeworkTemplatesByCourse(courseId: string): Promise<HomeworkTemplate[]>
getApprovedTemplatesByUnit(unitId: string): Promise<HomeworkTemplate[]>
```

### 12c. Vocabulary Mastery CRUD

**Also client-side Firestore calls.**

```typescript
getVocabularyMasteryByStudent(studentId: string): Promise<VocabularyMasteryRecord[]>
getVocabularyNeedingReview(studentId: string): Promise<VocabularyMasteryRecord[]>
getVocabularySnapshot(studentId: string): Promise<AdvisorContext['vocabularySnapshot']>
// Create/update handled by updateVocabularyMastery() in Section 7a (called after homework grading)
```

---

## 13. Implementation Order

### Phase A: Foundation (Build First)

| Step | Task | Files | Notes |
|------|------|-------|-------|
| A1 | Add `HomeworkTemplate` type | `src/lib/types.ts` | New type |
| A2 | Add `VocabularyMasteryRecord` type | `src/lib/types.ts` | New type |
| A3 | Add `AIProviderConfig`, `AIProviderName`, `AIUsageLogEntry` types | `src/lib/types.ts` | New types |
| A4 | Add `templateId` to `HomeworkAssignment` type | `src/lib/types.ts` | Add optional field |
| A5 | Homework template Firestore CRUD + queries | `src/lib/firestore.ts` | New functions |
| A6 | Vocabulary mastery Firestore CRUD + queries | `src/lib/firestore.ts` | New functions |
| A7 | Firestore rules for new collections | `firestore.rules` | New rules |
| A8 | Firestore indexes | Firebase Console | New indexes |

### Phase B: AI Integration Layer (Build Second)

| Step | Task | Files | Notes |
|------|------|-------|-------|
| B1 | AI types + shared interface | `src/lib/ai/types.ts` | New file |
| B2 | Claude adapter | `src/lib/ai/providers/claude.ts` | New file |
| B3 | DeepSeek adapter | `src/lib/ai/providers/deepseek.ts` | New file |
| B4 | MiniMax adapter | `src/lib/ai/providers/minimax.ts` | New file |
| B5 | Qwen adapter | `src/lib/ai/providers/qwen.ts` | New file |
| B6 | OpenAI-compatible adapter | `src/lib/ai/providers/openai-compatible.ts` | New file |
| B7 | Provider resolver | `src/lib/ai/resolve-provider.ts` | New file |
| B8 | AI service (main entry point) | `src/lib/ai/ai-service.ts` | New file |
| B9 | AI completion API route | `src/app/api/ai/complete/route.ts` | New route (server-side) |
| B10 | Usage logging | `src/lib/ai/usage-logger.ts` | New file |

### Phase C: Template Management UI (Build Third)

| Step | Task | Files | Notes |
|------|------|-------|-------|
| C1 | Template list component on unit page | `src/app/t-portal/` (TBD exact location) | New component |
| C2 | Add/edit template form with AI generation | Same area | New component |
| C3 | Completeness indicator badge | Reusable component | Used on unit cards |
| C4 | Update assign form to use template picker | `src/components/assign-homework-form.tsx` | Modify existing |
| C5 | Add `teacherInstructions` input to assign form | Same file | Add the missing text box |

### Phase D: Vocabulary Tracker (Build Fourth)

| Step | Task | Files | Notes |
|------|------|-------|-------|
| D1 | Wire `updateVocabularyMastery()` into homework grading flow | `src/lib/firestore.ts` or homework tab | After JSON parse |
| D2 | Vocabulary dashboard on L profile | `src/app/t-portal/students/[id]/` | New component or sub-tab |

### Phase E: AI Advisor (Build Fifth)

| Step | Task | Files | Notes |
|------|------|-------|-------|
| E1 | Advisor context assembly function | `src/lib/ai/advisor-context.ts` | New file |
| E2 | Advisor prompt template | `src/lib/ai/prompts/advisor.ts` | New file |
| E3 | Advisor UI on L profile | `src/app/t-portal/students/[id]/` | New component |
| E4 | "Assign from recommendation" inline action | Same component | Wire to assign form |

### Phase F: Admin & Settings (Build Sixth)

| Step | Task | Files | Notes |
|------|------|-------|-------|
| F1 | Admin AI settings page | `src/app/admin/` | New page |
| F2 | T-portal AI override in settings | `src/app/t-portal/settings/` | Add section |
| F3 | Usage dashboard (admin) | `src/app/admin/` | New component |

### Stackable (Build Whenever)

- Unit description AI generation (same AI layer, different prompt — can be added to unit editor anytime)
- Assessment analysis AI generation (Phase 14 — uses same AI layer when that phase is built)
- Session feedback AI generation (Phase 15/16 — uses same AI layer)

---

## 14. What This Spec Does NOT Include

- **Embedding workbooks in S-portal** — future (Phase 15-B Section 10c)
- **Auto-submit JSON from embedded workbooks** — future (requires postMessage bridge)
- **LL generating workbook HTML from unit data** — future (Phase 15-B Section 10a)
- **L-facing AI** (chatbot, Socratic dialogue) — not in scope
- **Adaptive sequencing** (system auto-assigns next homework) — T decides, advisor recommends
- **Full spaced repetition algorithm** — lightweight staleness check only
- **Multi-T course sharing / curriculum forking** — single-T for now
- **KUPT/KTFT integration into LL** — Kiddoland tools remain external

---

## 15. Relationship to Existing Specs

| Spec | Relationship |
|------|-------------|
| **Phase 15-B (Homework)** | This spec adds templates on top. Existing `homeworkAssignments` gain `templateId`. Parser, grading, upload all stay as-is. |
| **Phase 14 (Assessments)** | Assessment analysis will use the AI layer built here. No changes to Phase 14 spec. |
| **Phase 15/16 (Feedback)** | Session feedback generation will use the AI layer. No changes to that spec. |
| **Course Page Architecture** | Curriculum accordion can show template completeness per unit. No blocking dependency. |
| **Unified Session History** | Timeline entries for homework already exist. Templates don't change timeline behavior. |
| **Phase 17 (Petland/Progress)** | Vocabulary mastery data feeds Pillar 3 alongside homework accuracy and assessment scores. |

---

## 16. Cost Estimates

Rough per-call token estimates (varies by provider):

| Feature | Input Tokens | Output Tokens | Calls/Month (est.) | Notes |
|---------|-------------|---------------|---------------------|-------|
| HW description | ~500 | ~300 | 20-40 | One per template creation |
| Unit description | ~400 | ~400 | 5-10 | One per unit creation |
| AI Advisor | ~2000-4000 | ~800 | 30-60 | Per L, on demand |
| Assessment analysis | ~1500 | ~600 | 10-20 | Per assessment |
| Session feedback | ~800 | ~500 | 40-80 | Per session completion |

**Estimated monthly cost by provider (at ~150 calls/month):**

| Provider | Approx. Cost | Notes |
|----------|-------------|-------|
| DeepSeek | $0.05-0.20 | Cheapest option by far |
| MiniMax | $0.10-0.40 | Very affordable |
| Qwen | $0.10-0.50 | Competitive pricing |
| Claude Sonnet | $1.50-5.00 | Higher quality, higher cost |
| Claude Opus | $15-50 | Overkill for most features |

**Recommendation:** Default to DeepSeek for cost efficiency. Use Claude Sonnet for the advisor (where quality matters most) if budget allows. T can override per their preference.

---

**Ready for:** Implementation Phase A (types + Firestore) → Phase B (AI layer)
**Estimated sessions:** 8-12 sessions for full implementation
**Blocked by:** Nothing — all dependencies complete
**Session ID:** Q35
