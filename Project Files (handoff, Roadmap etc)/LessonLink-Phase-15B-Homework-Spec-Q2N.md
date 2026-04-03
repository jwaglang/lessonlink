# LessonLink Phase 15-B: Homework System Spec

**Date:** February 23, 2026
**Status:** Spec ready, not started
**Dependencies:** Phase 15/16 (session feedback) ✅, Phase 14 (assessments) ✅, Phase 15-C (import tools) ✅

---

## 1. Goal

Enable T to assign homework linked to sessions, track L completion via JSON upload from external Kiddoland workbooks/worksheets, grade submissions, and feed accuracy data into `studentProgress` for the holistic progress model (Phase 17/18).

**What this phase is NOT:**
- Not rebuilding Kiddoland workbooks as React components (future)
- Not generating workbook HTML inside LL (future — see Section 10)
- Not integrating KUPT/KTFT into LL (future)

**What this phase IS:**
- LL-side homework assignment, tracking, grading, and progress pipeline
- JSON upload from external Kiddoland HTML workbooks/worksheets
- Email notification to L/parent when homework is assigned
- Accuracy tracking feeding into `studentProgress`

---

## 2. Architecture Decision

Kiddoland workbook/worksheet tools are **standalone HTML mini-apps** that T creates externally (via AI prompt + template). They export JSON with student progress data. LL's role in Phase 15-B is:

1. **Assign** — T links homework to a session/unit/L
2. **Notify** — LL emails L/parent with homework details (attachment or instructions)
3. **Collect** — T uploads JSON results exported from the workbook/worksheet
4. **Grade** — T reviews parsed results, adjusts score if needed
5. **Track** — LL updates `studentProgress` with homework accuracy stats

Future phases will tighten this loop (embed workbooks in S-portal, auto-submit JSON, generate workbooks from unit data inside LL).

---

## 3. Data Model

### 3a. `homeworkAssignments` Collection (NEW)

```typescript
interface HomeworkAssignment {
  id: string;

  // Links
  studentId: string;
  teacherId: string;
  courseId: string;
  unitId: string;
  sessionId?: string;              // session template ID (optional — can be unit-level HW)
  sessionInstanceId?: string;      // specific session instance that triggered this HW

  // Content
  title: string;                   // e.g. "Colors and Shapes Workbook"
  description?: string;            // T's instructions to L/parent
  homeworkType: 'workbook' | 'worksheet' | 'song_worksheet' | 'other';
  
  // Delivery
  deliveryMethod: 'email' | 'manual' | 'in_app';  // Phase 15-B: email or manual
  deliveredAt?: string;            // ISO timestamp when email sent
  
  // Submission (JSON upload from external tool)
  submission?: {
    uploadedAt: string;            // ISO timestamp
    uploadedBy: 'teacher' | 'parent';  // who uploaded the JSON
    rawJson: Record<string, any>;  // full JSON from workbook/worksheet export
    parsedResults: ParsedHomeworkResults;
  };

  // Grading
  grading?: {
    score: number;                 // 0-100 percentage
    maxScore: number;              // max possible (e.g. 8 for 8 activities)
    achievedScore: number;         // actual achieved (e.g. 6 of 8)
    teacherNotes?: string;         // T's comments on the submission
    gradedAt: string;              // ISO timestamp
    gradedBy: string;              // teacherId
  };

  // Status
  status: 'assigned' | 'delivered' | 'submitted' | 'graded';
  dueDate?: string;                // optional due date
  createdAt: string;
  updatedAt: string;
}
```

### 3b. `ParsedHomeworkResults` (embedded in submission)

```typescript
interface ParsedHomeworkResults {
  // Common fields (parsed from any workbook/worksheet JSON)
  studentName?: string;
  completedActivities: string[];   // activity identifiers completed
  totalActivities: number;         // total available
  completionRate: number;          // 0-1 (completedActivities.length / totalActivities)
  
  // Workbook-specific
  wordLevels?: Record<string, number>;    // vocabulary mastery per word
  
  // Song worksheet-specific
  matchingScore?: { correct: number; total: number };
  questionAnswers?: Record<string, string>;
  talkAnswers?: Record<string, string>;
  singCount?: number;
  
  // Generic catch-all for future tool types
  toolSpecificData?: Record<string, any>;
}
```

### 3c. Updates to `StudentProgress`

```typescript
// Add to existing StudentProgress type
{
  // ... existing fields ...
  
  // NEW: Homework tracking
  homeworkAssigned: number;        // total HW assignments for this unit
  homeworkCompleted: number;       // HW with status 'graded'
  homeworkAccuracyAvg: number;    // average grading.score across graded HW (0-100)
  homeworkCompletionRate: number;  // homeworkCompleted / homeworkAssigned (0-1)
}
```

---

## 4. JSON Parsing Logic

The workbook and worksheet tools export different JSON structures. LL needs a parser that normalizes both into `ParsedHomeworkResults`.

### 4a. Workbook JSON Structure (from Kiddoland_Workbook_WHITE_Template.html)

```json
{
  "version": "1.0",
  "exportDate": "2026-02-23T10:00:00.000Z",
  "lessonTitle": "Colors and Shapes",
  "studentData": {
    "name": "Luna",
    "startDate": "2026-02-20",
    "endDate": "2026-02-23",
    "completedActivities": [1, 2, 3, 5, 7]
  },
  "wordLevels": {
    "circle": 3,
    "square": 2,
    "red": 4,
    "blue": 1
  },
  "completedActivities": [1, 2, 3, 5, 7]
}
```

**Parsing rules:**
- `totalActivities` = 8 (always 8 for workbook template)
- `completedActivities` = `studentData.completedActivities`
- `completionRate` = `completedActivities.length / 8`
- `wordLevels` = direct map (higher = better mastery)
- Default score = `completionRate * 100` (T can override)

### 4b. Song Worksheet JSON Structure (from Kiddoland_Song_Worksheet_Tool.html)

```json
{
  "studentName": "Luna",
  "sessionDate": "2026-02-23",
  "singCount": 3,
  "matchAnswers": { "0": "answer1", "1": "answer2" },
  "questionAnswers": { "0": "The cat is big", "1": "I like dogs" },
  "talkAnswers": { "0": "My favorite animal is...", "1": "" },
  "timestamp": "2026-02-23T10:30:00.000Z"
}
```

**Parsing rules:**
- `totalActivities` = 4 (sing-along + matching + questions + tiny talks)
- Matching score derived from `matchAnswers` vs correct answers (needs answer key — T provides or workbook embeds)
- `singCount` > 0 = sing-along activity complete
- Non-empty `questionAnswers` = questions activity complete
- Non-empty `talkAnswers` = tiny talks activity complete
- Default score = T grades manually (open-ended responses can't auto-score)

### 4c. Parser Function

```typescript
function parseHomeworkJson(
  rawJson: Record<string, any>, 
  homeworkType: HomeworkAssignment['homeworkType']
): ParsedHomeworkResults {
  switch (homeworkType) {
    case 'workbook':
      return parseWorkbookJson(rawJson);
    case 'song_worksheet':
      return parseSongWorksheetJson(rawJson);
    default:
      return parseGenericJson(rawJson);
  }
}
```

This lives in `src/lib/homework-parser.ts`.

---

## 5. User Flows

### 5a. T Assigns Homework (T-portal)

**Entry points:**
1. Post-session completion (in weekly-calendar.tsx dialog, after feedback section)
2. From L profile → Sessions tab → completed session card → "Assign Homework"
3. From L profile → new "Homework" sub-section (shows all HW for this L)

**Flow:**
1. T clicks "Assign Homework"
2. Dialog/form shows:
   - Title (pre-filled from session title + "Homework")
   - Homework type selector (workbook / song worksheet / other)
   - Description/instructions (free text)
   - Due date (optional)
   - Delivery method: Email to parent / Manual
3. T clicks "Assign"
4. LL creates `homeworkAssignment` doc (status: `assigned`)
5. If email delivery: LL sends email via Resend to L/parent email
6. Status updates to `delivered` after email sent

### 5b. T Uploads JSON Results (T-portal)

**Entry point:** L profile → Homework section → assignment card → "Upload Results"

**Flow:**
1. T clicks "Upload Results" on an assigned/delivered homework
2. File picker opens (accepts `.json`)
3. LL parses JSON using `parseHomeworkJson()`
4. Preview screen shows parsed results:
   - Activities completed: 6/8
   - Completion rate: 75%
   - Word mastery levels (if workbook)
   - Matching score (if song worksheet)
5. T can adjust auto-calculated score
6. T adds optional grading notes
7. T clicks "Save & Grade"
8. LL updates the homework doc with `submission` + `grading`
9. LL updates `studentProgress` homework fields
10. Status → `graded`

### 5c. T Reviews All Homework for L (T-portal)

**Location:** L profile page → new tab or sub-section under Sessions tab

**View:**
- List of all homework for this L, filterable by status
- Each card shows: title, session link, status badge, score (if graded), due date
- Expandable to show parsed results detail
- "Upload Results" button on ungraded items

### 5d. L/Parent Views Homework (S-portal) — Minimal for Phase 15-B

**Location:** S-portal → Courses → Feedback (or new "Homework" sub-item)

**View:**
- List of assigned homework with status
- Title, assigned date, due date, status badge
- If graded: score and T notes visible
- No submission interface in Phase 15-B (L completes workbook externally, T uploads JSON)

---

## 6. Email Template

### Homework Assignment Email

**Template name:** `homeworkAssignmentEmail`
**Sender:** notifications@updates.kiddoland.co
**Reply-to:** kiddo@kiddoland.co

**Subject:** New Homework: {title}

**Body structure:**
- Kiddoland purple header (matches existing email templates)
- "Hi {learnerName}'s family!"
- "{tutorName} has assigned new homework:"
- Title, description, due date
- Instructions for completing (open the attached workbook, complete activities, export JSON, send back)
- Kiddoland footer

**Implementation:** Add to existing `src/lib/email-templates.ts` following the pattern of `sessionFeedbackEmail` and `parentReportEmail`.

---

## 7. Firestore Functions

Add to `src/lib/firestore.ts`:

```typescript
// CRUD
createHomeworkAssignment(data: Omit<HomeworkAssignment, 'id'>): Promise<string>
getHomeworkAssignment(id: string): Promise<HomeworkAssignment | null>
updateHomeworkAssignment(id: string, data: Partial<HomeworkAssignment>): Promise<void>
deleteHomeworkAssignment(id: string): Promise<void>

// Queries
getHomeworkByStudent(studentId: string): Promise<HomeworkAssignment[]>
getHomeworkBySession(sessionInstanceId: string): Promise<HomeworkAssignment[]>
getHomeworkByUnit(unitId: string, studentId: string): Promise<HomeworkAssignment[]>
getPendingHomework(studentId: string): Promise<HomeworkAssignment[]>  // status != 'graded'
```

---

## 8. API Routes

### POST /api/homework/assign
- Creates homework assignment
- Optionally sends email via Resend
- Returns homework doc ID

### POST /api/homework/[id]/upload-results  
- Accepts JSON file upload
- Parses with `parseHomeworkJson()`
- Stores raw + parsed results
- Returns parsed preview for T to review

### POST /api/homework/[id]/grade
- T submits final score + notes
- Updates homework doc with grading
- Updates `studentProgress` with new homework stats
- Returns updated homework doc

---

## 9. Implementation Order

| Step | Task | Files |
|------|------|-------|
| 1 | Add `HomeworkAssignment` + `ParsedHomeworkResults` types to `types.ts` | `src/lib/types.ts` |
| 2 | Add homework fields to `StudentProgress` type | `src/lib/types.ts` |
| 3 | Create `homework-parser.ts` with workbook + song worksheet parsers | `src/lib/homework-parser.ts` |
| 4 | Add Firestore CRUD + query functions | `src/lib/firestore.ts` |
| 5 | Create homework assignment email template | `src/lib/email-templates.ts` |
| 6 | Create API routes (assign, upload, grade) | `src/app/api/homework/` |
| 7 | Add "Assign Homework" button to weekly-calendar.tsx (post-completion, after feedback) | `weekly-calendar.tsx` |
| 8 | Build homework section in L profile page (T-portal) | `src/app/t-portal/students/[id]/` |
| 9 | Build homework list view in S-portal | `src/app/s-portal/` |
| 10 | Wire `studentProgress` updates on grading | `src/lib/firestore.ts` or API route |
| 11 | Test E2E: assign → email → upload JSON → grade → verify progress | Manual |

---

## 10. Future Integration Path (NOT Phase 15-B)

These are specced here for context but are **deferred**:

### 10a. LL Generates Workbook HTML from Unit Data
- T clicks "Generate Workbook" on a session in the unit editor
- LL reads session data (title, vocabulary, LQ) from Firestore
- LL calls AI API with the workbook prompt template + session data
- AI returns complete HTML workbook
- T previews, edits, approves
- HTML stored or emailed directly to L

### 10b. KUPT/KTFT Integration
- Kiddoland Tools (Unit Plan Tool + Task Framework Tool) develop independently
- When mature, embed into LL T-portal as iframe or migrate to React
- Unit plans created in KUPT automatically create `units` + `sessions` in Firestore
- Task framework outputs link directly to homework assignments

### 10c. S-Portal Embedded Worksheets
- Host workbook HTML as static assets or in Firebase Storage
- Embed in S-portal via iframe
- Add `postMessage` bridge: workbook completion → auto-submit JSON to LL API
- Eliminates manual JSON upload step
- L completes homework entirely within S-portal

### 10d. Auto-Scoring
- For structured activities (matching, fill-in-the-blank, memory), auto-score from JSON
- For open-ended activities (questions, tiny talks, recordings), AI-assisted grading
- T still approves final score

---

## 11. Collections Quick Reference (Updated)

| Collection | Created By | Purpose |
|------------|-----------|---------|
| `homeworkAssignments` | T (assign) | Homework tracking: assign → deliver → submit → grade |
| `studentProgress` | T (assign unit) | Updated with homework stats on grading |
| `sessionFeedback` | T (post-session) | Session feedback (Phase 15/16, separate from homework) |
| `assessmentReports` | T (evaluation) | Formal assessments (Phase 14, separate from homework) |

---

## 12. Relationship to Three Pillars (Phase 17)

Phase 15-B feeds **Pillar 3: Formal Assessment** alongside Phase 14 evaluations:

| Data Point | Source | Field |
|-----------|--------|-------|
| Session hours | `sessionInstances` | Pillar 1 |
| XP/HP | Petland webhook | Pillar 2 |
| Assessment scores | `assessmentReports` | Pillar 3a |
| **Homework accuracy** | **`homeworkAssignments`** | **Pillar 3b** |

The holistic progress formula (Phase 17) will combine all four.

---

**Ready for:** Implementation Step 1 (types) through Step 11 (E2E test)
**Estimated sessions:** 5-8 sessions depending on complexity of T-portal UI
**Blocked by:** Nothing — all dependencies complete
