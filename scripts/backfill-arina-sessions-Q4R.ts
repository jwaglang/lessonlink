/**
 * Backfill Arina's 18 real sessions (Q4R)
 *
 * What this does:
 *   1. Deletes all existing sessionInstances for Arina (test data)
 *   2. Deletes all existing studentProgress for Arina
 *   3. Deletes all existing studentCredit for Arina
 *   4. Creates 18 completed sessionInstances (30 min each)
 *   5. Creates studentProgress per unit (grouped)
 *   6. Creates studentCredit per course:
 *        Fun Phonics  — 5h total, 5h completed, 0 remaining
 *        Fast Fluency — 5h total, 4h completed, 1h uncommitted (2 sessions left)
 *
 * Session split:
 *   Fun Phonics (10 sessions): The Ostrich 3, The Rabbit 1-2, Tiger 1-3,
 *                               Two Zebras 1-2, Playing with letters 1-2
 *   Fast Fluency (8 sessions): The Ocean 1-3, The City 1-4, Farm Animals 1
 *
 * Unit substitution: units not yet in Firestore get the first available unit
 * from that course as a placeholder.
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { config } from 'dotenv';

config({ path: '.env.local' });

const app = getApps().length === 0
  ? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  : getApps()[0];

const db = getFirestore(app);

// ── Constants ────────────────────────────────────────────────────────────────

const ARINA_ID    = 'iaWH8v359kXT3qMTuIwT7OHpCRJ2';
const FP_ID       = 'EFVANTW1gYtYgU2La7s8';  // Fun Phonics
const FF_ID       = '45Jkyfg94otjc4d22dZT';  // Fast Fluency
const DURATION    = 30;
const START_TIME  = '10:00';
const END_TIME    = '10:30';

// Hexdate → ISO date conversions (base-36, Q=2026)
// Day:  1-9, A=10, B=11, C=12, D=13, E=14, F=15, G=16, H=17, I=18,
//       J=19, K=20, L=21, M=22, N=23, O=24, P=25, Q=26, R=27, S=28, T=29, V=31

interface SessionEntry {
  date: string;       // YYYY-MM-DD
  title: string;      // display title
  courseId: string;
  unitTitle: string;  // used to look up / substitute unit
}

const SESSIONS: SessionEntry[] = [
  // ── Fun Phonics ──
  { date: '2026-02-03', title: 'The Ostrich 3',        courseId: FP_ID, unitTitle: 'The Ostrich' },
  { date: '2026-02-05', title: 'The Rabbit 1',         courseId: FP_ID, unitTitle: 'The Rabbit' },
  { date: '2026-02-10', title: 'The Rabbit 2',         courseId: FP_ID, unitTitle: 'The Rabbit' },
  { date: '2026-02-12', title: 'Tiger 1',              courseId: FP_ID, unitTitle: 'Tiger' },
  { date: '2026-02-17', title: 'Tiger 2',              courseId: FP_ID, unitTitle: 'Tiger' },
  { date: '2026-02-19', title: 'Tiger 3',              courseId: FP_ID, unitTitle: 'Tiger' },
  { date: '2026-02-26', title: 'Two Zebras 1',         courseId: FP_ID, unitTitle: 'Two Zebras' },
  { date: '2026-03-03', title: 'Two Zebras 2',         courseId: FP_ID, unitTitle: 'Two Zebras' },
  { date: '2026-03-05', title: 'Playing with letters 1', courseId: FP_ID, unitTitle: 'Playing with letters' },
  { date: '2026-03-10', title: 'Playing with letters 2', courseId: FP_ID, unitTitle: 'Playing with letters' },
  // ── Fast Fluency ──
  { date: '2026-03-12', title: 'The Ocean 1',          courseId: FF_ID, unitTitle: 'The Ocean' },
  { date: '2026-03-17', title: 'The Ocean 2',          courseId: FF_ID, unitTitle: 'The Ocean' },
  { date: '2026-03-26', title: 'The Ocean 3',          courseId: FF_ID, unitTitle: 'The Ocean' },
  { date: '2026-04-07', title: 'The City 1',           courseId: FF_ID, unitTitle: 'The City' },
  { date: '2026-04-09', title: 'The City 2',           courseId: FF_ID, unitTitle: 'The City' },
  { date: '2026-04-14', title: 'The City 3',           courseId: FF_ID, unitTitle: 'The City' },
  { date: '2026-04-21', title: 'The City 4',           courseId: FF_ID, unitTitle: 'The City' },
  { date: '2026-04-23', title: 'Farm Animals 1',       courseId: FF_ID, unitTitle: 'Farm Animals' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function deleteCollection(collectionName: string, field: string, value: string) {
  const snap = await db.collection(collectionName).where(field, '==', value).get();
  if (snap.empty) { console.log(`  ${collectionName}: nothing to delete`); return 0; }
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  console.log(`  ${collectionName}: deleted ${snap.docs.length} docs`);
  return snap.docs.length;
}

async function getTeacherUid(): Promise<string> {
  const snap = await db.collection('teacherProfiles')
    .where('email', '==', 'jwag.lang@gmail.com')
    .limit(1).get();
  if (!snap.empty) return snap.docs[0].id;
  // fallback: try users collection
  const snap2 = await db.collection('users')
    .where('email', '==', 'jwag.lang@gmail.com')
    .limit(1).get();
  if (!snap2.empty) return snap2.docs[0].id;
  throw new Error('Teacher UID not found — check teacherProfiles collection');
}

async function resolveUnitId(courseId: string, unitTitle: string, fallbackId: string): Promise<string> {
  const snap = await db.collection('units')
    .where('courseId', '==', courseId)
    .where('title', '==', unitTitle)
    .limit(1).get();
  if (!snap.empty) return snap.docs[0].id;
  // exact match failed — try contains
  const allSnap = await db.collection('units').where('courseId', '==', courseId).get();
  const fuzzy = allSnap.docs.find(d =>
    (d.data().title as string)?.toLowerCase().includes(unitTitle.toLowerCase())
  );
  if (fuzzy) return fuzzy.id;
  return fallbackId;
}

async function getFallbackUnit(courseId: string): Promise<string> {
  const snap = await db.collection('units')
    .where('courseId', '==', courseId)
    .limit(1).get();
  if (snap.empty) throw new Error(`No units found for course ${courseId}`);
  return snap.docs[0].id;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('═══════════════════════════════════════════════');
  console.log(' Arina session backfill — Q4R');
  console.log('═══════════════════════════════════════════════\n');

  const teacherUid = await getTeacherUid();
  console.log(`Teacher UID: ${teacherUid}`);

  const fpFallback = await getFallbackUnit(FP_ID);
  const ffFallback = await getFallbackUnit(FF_ID);
  console.log(`FP fallback unit: ${fpFallback}`);
  console.log(`FF fallback unit: ${ffFallback}\n`);

  // ── Step 1: Wipe test data ──────────────────────────────────────────────
  console.log('Step 1 — Deleting existing test data for Arina...');
  await deleteCollection('sessionInstances', 'studentId', ARINA_ID);
  await deleteCollection('studentProgress',  'studentId', ARINA_ID);
  await deleteCollection('studentCredit',    'studentId', ARINA_ID);
  console.log('');

  // ── Step 2: Resolve unit IDs ────────────────────────────────────────────
  console.log('Step 2 — Resolving unit IDs...');
  const resolvedSessions: Array<SessionEntry & { unitId: string; resolved: boolean }> = [];
  for (const s of SESSIONS) {
    const fallback = s.courseId === FP_ID ? fpFallback : ffFallback;
    const unitId = await resolveUnitId(s.courseId, s.unitTitle, fallback);
    const resolved = unitId !== fallback;
    resolvedSessions.push({ ...s, unitId, resolved });
    console.log(`  ${s.title.padEnd(28)} → ${resolved ? s.unitTitle : `[sub] ${unitId.slice(0, 8)}…`}`);
  }
  console.log('');

  // ── Step 3: Create sessionInstances ────────────────────────────────────
  console.log('Step 3 — Creating 18 sessionInstances...');
  const now = Timestamp.now();
  const batch1 = db.batch();
  for (const s of resolvedSessions) {
    const ref = db.collection('sessionInstances').doc();
    batch1.set(ref, {
      studentId:    ARINA_ID,
      teacherUid,
      courseId:     s.courseId,
      unitId:       s.unitId,
      title:        s.title,
      lessonDate:   s.date,
      startTime:    START_TIME,
      endTime:      END_TIME,
      durationHours: 0.5,
      billingType:  'credit',
      rate:         17.6,   // hourlyRate 35.2 / 2 for 30-min
      status:       'completed',
      completedAt:  s.date,
      createdAt:    now,
      updatedAt:    now,
    });
  }
  await batch1.commit();
  console.log('  ✓ 18 sessionInstances created\n');

  // ── Step 4: Create studentProgress per unit ─────────────────────────────
  console.log('Step 4 — Creating studentProgress per unit...');
  const unitGroups = new Map<string, { courseId: string; unitId: string; sessions: typeof resolvedSessions }>();
  for (const s of resolvedSessions) {
    const key = `${s.courseId}::${s.unitId}`;
    if (!unitGroups.has(key)) {
      unitGroups.set(key, { courseId: s.courseId, unitId: s.unitId, sessions: [] });
    }
    unitGroups.get(key)!.sessions.push(s);
  }

  const batch2 = db.batch();
  for (const [, group] of unitGroups) {
    const ref = db.collection('studentProgress').doc();
    const sessCount = group.sessions.length;
    const hours = sessCount * 0.5;
    batch2.set(ref, {
      studentId:           ARINA_ID,
      courseId:            group.courseId,
      unitId:              group.unitId,
      status:              'completed',
      totalHoursCompleted: hours,
      targetHours:         hours,
      percentComplete:     100,
      sessionsCompleted:   sessCount,
      sessionsTotal:       sessCount,
      unitsCompleted:      1,
      unitsTotal:          1,
      lastActivityAt:      group.sessions[group.sessions.length - 1].date,
      startedAt:           group.sessions[0].date,
      completedAt:         group.sessions[group.sessions.length - 1].date,
      createdAt:           now,
      updatedAt:           now,
    });
    console.log(`  Unit ${group.unitId.slice(0, 8)}… — ${sessCount} session(s), ${hours}h`);
  }
  await batch2.commit();
  console.log('  ✓ studentProgress created\n');

  // ── Step 5: Create studentCredit per course ─────────────────────────────
  console.log('Step 5 — Creating studentCredit...');
  // FP: 10 sessions × 0.5h = 5h, all done
  // FF: 8 done × 0.5h = 4h done, 1h uncommitted (2 sessions remaining)
  const credits = [
    {
      courseId:         FP_ID,
      totalHours:       5,
      completedHours:   5,
      committedHours:   0,
      uncommittedHours: 0,
    },
    {
      courseId:         FF_ID,
      totalHours:       5,
      completedHours:   4,
      committedHours:   0,
      uncommittedHours: 1,
    },
  ];
  const batch3 = db.batch();
  for (const c of credits) {
    const ref = db.collection('studentCredit').doc();
    batch3.set(ref, {
      studentId:        ARINA_ID,
      courseId:         c.courseId,
      totalHours:       c.totalHours,
      completedHours:   c.completedHours,
      committedHours:   c.committedHours,
      uncommittedHours: c.uncommittedHours,
      currency:         'EUR',
      createdAt:        now.toDate().toISOString(),
      updatedAt:        now.toDate().toISOString(),
    });
    console.log(`  ${c.courseId === FP_ID ? 'Fun Phonics' : 'Fast Fluency'}: ${c.completedHours}h completed, ${c.uncommittedHours}h remaining`);
  }
  await batch3.commit();
  console.log('  ✓ studentCredit created\n');

  console.log('═══════════════════════════════════════════════');
  console.log(' Done. Verify at /t-portal/students/iaWH8v359kXT3qMTuIwT7OHpCRJ2');
  console.log('═══════════════════════════════════════════════');
}

run().catch(console.error);
