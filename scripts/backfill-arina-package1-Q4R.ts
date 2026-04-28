/**
 * Backfill Arina's Package 1 (TLK P1) — Q4R
 *
 * What this does:
 *   1. Creates a payment record for Package 1 (same amount as Package 2: €293.67)
 *   2. Creates 20 completed sessionInstances (30 min each, all Fun Phonics)
 *   3. Creates studentProgress per unit
 *   4. Updates FP studentCredit: adds 10h completed (P1) to the 5h already
 *      backfilled from P2, bringing FP total to 15h completed / 0 remaining
 *
 * P1 sessions: An Apple 1-2, The Car 1-2, An Elephant 1-2, The Hat 1-3,
 *              An Iguana 1-3, The Kite 1-3, The Monkey 1-3, The Ostrich 1-2
 *
 * Hexdate decoding: P=2025, Q=2026 | Month: 1-9, A=Oct, B=Nov, C=Dec
 *                   Day: 1-9, A=10 … T=29, U=30, V=31
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

const ARINA_ID   = 'iaWH8v359kXT3qMTuIwT7OHpCRJ2';
const FP_ID      = 'EFVANTW1gYtYgU2La7s8';   // Fun Phonics
const DURATION   = 30;
const START_TIME = '10:00';
const END_TIME   = '10:30';

interface SessionEntry {
  date: string;
  title: string;
  unitTitle: string;
}

const SESSIONS: SessionEntry[] = [
  { date: '2025-10-21', title: 'An Apple 1',       unitTitle: 'An Apple' },
  { date: '2025-10-23', title: 'An Apple 2',       unitTitle: 'An Apple' },
  { date: '2025-10-28', title: 'The Car 1',        unitTitle: 'The Car' },
  { date: '2025-10-30', title: 'The Car 2',        unitTitle: 'The Car' },
  { date: '2025-11-25', title: 'An Elephant 1',    unitTitle: 'An Elephant' },
  { date: '2025-11-27', title: 'An Elephant 2',    unitTitle: 'An Elephant' },
  { date: '2025-12-02', title: 'The Hat 1',        unitTitle: 'The Hat' },
  { date: '2025-12-04', title: 'The Hat 2',        unitTitle: 'The Hat' },
  { date: '2025-12-09', title: 'The Hat 3',        unitTitle: 'The Hat' },
  { date: '2025-12-16', title: 'An Iguana 1',      unitTitle: 'An Iguana' },
  { date: '2025-12-18', title: 'An Iguana 2',      unitTitle: 'An Iguana' },
  { date: '2025-12-30', title: 'An Iguana 3',      unitTitle: 'An Iguana' },
  { date: '2026-01-06', title: 'The Kite 1',       unitTitle: 'The Kite' },
  { date: '2026-01-08', title: 'The Kite 2',       unitTitle: 'The Kite' },
  { date: '2026-01-13', title: 'The Kite 3',       unitTitle: 'The Kite' },
  { date: '2026-01-15', title: 'The Monkey 1',     unitTitle: 'The Monkey' },
  { date: '2026-01-20', title: 'The Monkey 2',     unitTitle: 'The Monkey' },
  { date: '2026-01-22', title: 'The Monkey 3',     unitTitle: 'The Monkey' },
  { date: '2026-01-27', title: 'The Ostrich 1',    unitTitle: 'The Ostrich' },
  { date: '2026-01-29', title: 'The Ostrich 2',    unitTitle: 'The Ostrich' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getTeacherUid(): Promise<string> {
  const snap = await db.collection('teacherProfiles')
    .where('email', '==', 'jwag.lang@gmail.com').limit(1).get();
  if (!snap.empty) return snap.docs[0].id;
  throw new Error('Teacher UID not found');
}

async function resolveUnitId(courseId: string, unitTitle: string, fallbackId: string): Promise<string> {
  const snap = await db.collection('units')
    .where('courseId', '==', courseId).where('title', '==', unitTitle).limit(1).get();
  if (!snap.empty) return snap.docs[0].id;
  const allSnap = await db.collection('units').where('courseId', '==', courseId).get();
  const fuzzy = allSnap.docs.find(d =>
    (d.data().title as string)?.toLowerCase().includes(unitTitle.toLowerCase())
  );
  return fuzzy ? fuzzy.id : fallbackId;
}

async function getFallbackUnit(courseId: string): Promise<string> {
  const snap = await db.collection('units').where('courseId', '==', courseId).limit(1).get();
  if (snap.empty) throw new Error(`No units found for course ${courseId}`);
  return snap.docs[0].id;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('═══════════════════════════════════════════════');
  console.log(' Arina Package 1 backfill — Q4R');
  console.log('═══════════════════════════════════════════════\n');

  const teacherUid = await getTeacherUid();
  console.log(`Teacher UID: ${teacherUid}`);

  const fpFallback = await getFallbackUnit(FP_ID);
  console.log(`FP fallback unit: ${fpFallback}\n`);

  const now = Timestamp.now();

  // ── Step 1: Payment record ──────────────────────────────────────────────
  console.log('Step 1 — Creating Package 1 payment record...');
  const paymentRef = await db.collection('payments').add({
    studentId:   ARINA_ID,
    courseId:    FP_ID,
    amount:      293.67,
    subtotal:    285.12,
    processingFee: 8.55,
    currency:    'EUR',
    type:        'package',
    method:      'stripe',
    status:      'completed',
    paymentDate: '2025-10-21',
    notes:       'Fun Phonics 10-Pack — 10-pack (30min) · Package 1',
    createdAt:   now.toDate().toISOString(),
  });
  console.log(`  ✓ Payment created: ${paymentRef.id}\n`);

  // ── Step 2: Resolve unit IDs ────────────────────────────────────────────
  console.log('Step 2 — Resolving unit IDs...');
  const resolved: Array<SessionEntry & { unitId: string }> = [];
  for (const s of SESSIONS) {
    const unitId = await resolveUnitId(FP_ID, s.unitTitle, fpFallback);
    resolved.push({ ...s, unitId });
    const label = unitId === fpFallback ? `[sub] ${unitId.slice(0, 8)}…` : s.unitTitle;
    console.log(`  ${s.title.padEnd(24)} → ${label}`);
  }
  console.log('');

  // ── Step 3: Create sessionInstances ────────────────────────────────────
  console.log('Step 3 — Creating 20 sessionInstances...');
  const batch1 = db.batch();
  for (const s of resolved) {
    const ref = db.collection('sessionInstances').doc();
    batch1.set(ref, {
      studentId:    ARINA_ID,
      teacherUid,
      courseId:     FP_ID,
      unitId:       s.unitId,
      title:        s.title,
      lessonDate:   s.date,
      startTime:    START_TIME,
      endTime:      END_TIME,
      durationHours: 0.5,
      billingType:  'credit',
      rate:         17.6,
      status:       'completed',
      completedAt:  s.date,
      createdAt:    now,
      updatedAt:    now,
    });
  }
  await batch1.commit();
  console.log('  ✓ 20 sessionInstances created\n');

  // ── Step 4: Create studentProgress per unit ─────────────────────────────
  console.log('Step 4 — Creating studentProgress per unit...');
  const unitGroups = new Map<string, { unitId: string; sessions: typeof resolved }>();
  for (const s of resolved) {
    if (!unitGroups.has(s.unitId)) unitGroups.set(s.unitId, { unitId: s.unitId, sessions: [] });
    unitGroups.get(s.unitId)!.sessions.push(s);
  }
  const batch2 = db.batch();
  for (const [, group] of unitGroups) {
    const sessCount = group.sessions.length;
    const hours = sessCount * 0.5;
    const ref = db.collection('studentProgress').doc();
    batch2.set(ref, {
      studentId:           ARINA_ID,
      courseId:            FP_ID,
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
    console.log(`  ${group.unitId.slice(0, 8)}… — ${sessCount} session(s), ${hours}h`);
  }
  await batch2.commit();
  console.log('  ✓ studentProgress created\n');

  // ── Step 5: Update FP studentCredit ────────────────────────────────────
  // P1 adds 10h (20 × 0.5h) to the 5h already set by the P2 backfill script.
  // Result: 15h total, 15h completed, 0 remaining.
  console.log('Step 5 — Updating Fun Phonics studentCredit...');
  const creditSnap = await db.collection('studentCredit')
    .where('studentId', '==', ARINA_ID)
    .where('courseId', '==', FP_ID)
    .limit(1).get();

  if (creditSnap.empty) {
    // Shouldn't happen if P2 backfill ran first, but handle gracefully
    const ref = db.collection('studentCredit').doc();
    await ref.set({
      studentId:        ARINA_ID,
      courseId:         FP_ID,
      totalHours:       15,
      completedHours:   15,
      committedHours:   0,
      uncommittedHours: 0,
      currency:         'EUR',
      createdAt:        now.toDate().toISOString(),
      updatedAt:        now.toDate().toISOString(),
    });
    console.log('  ✓ FP credit created (15h total, 15h completed)');
  } else {
    const doc = creditSnap.docs[0];
    const current = doc.data();
    const newCompleted = (current.completedHours ?? 0) + 10;
    const newTotal = (current.totalHours ?? 0) + 10;
    await doc.ref.update({
      completedHours:   newCompleted,
      totalHours:       newTotal,
      uncommittedHours: 0,
      updatedAt:        now.toDate().toISOString(),
    });
    console.log(`  ✓ FP credit updated: ${newTotal}h total, ${newCompleted}h completed`);
  }
  console.log('');

  console.log('═══════════════════════════════════════════════');
  console.log(' Done. Verify at /t-portal/students/iaWH8v359kXT3qMTuIwT7OHpCRJ2');
  console.log('═══════════════════════════════════════════════');
}

run().catch(console.error);
