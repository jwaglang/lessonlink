/**
 * Fix Arina's studentPackages — Q4R
 *
 * Problems:
 *   1. Package 1 (Oct 2025 – Jan 2026, 20 FP sessions) exists only in `payments`,
 *      never written to `studentPackages` → tab shows "1 package" instead of 2
 *   2. Package 2's hoursRemaining is stale (9.5) → should be 1
 *      (18 sessions done = 9h; 2 sessions today still uncommitted = 1h left)
 *
 * What this does:
 *   1. Creates a `studentPackages` doc for Package 1:
 *        status: completed, hoursRemaining: 0, totalHours: 10
 *   2. Updates Package 2's hoursRemaining to 1
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

const ARINA_ID = 'iaWH8v359kXT3qMTuIwT7OHpCRJ2';
const FP_ID    = 'EFVANTW1gYtYgU2La7s8';

async function run() {
  console.log('═══════════════════════════════════════════════');
  console.log(' Fix Arina studentPackages — Q4R');
  console.log('═══════════════════════════════════════════════\n');

  // ── Step 1: Find existing studentPackages for Arina ─────────────────────
  console.log('Step 1 — Loading existing studentPackages...');
  const pkgSnap = await db.collection('studentPackages')
    .where('studentId', '==', ARINA_ID)
    .get();

  console.log(`  Found ${pkgSnap.docs.length} package(s):`);
  for (const d of pkgSnap.docs) {
    const data = d.data();
    console.log(`  • ${d.id} | ${data.courseTitle} | purchased ${data.purchaseDate} | ${data.hoursRemaining}/${data.totalHours}h remaining | ${data.status}`);
  }
  console.log('');

  // ── Step 2: Find the courseTitle for Fun Phonics ─────────────────────────
  console.log('Step 2 — Resolving Fun Phonics course title...');
  const courseSnap = await db.collection('courses').doc(FP_ID).get();
  const courseTitle = courseSnap.exists ? (courseSnap.data()?.title ?? 'Fun Phonics') : 'Fun Phonics';
  console.log(`  Course title: "${courseTitle}"\n`);

  // ── Step 3: Create Package 1 studentPackages record ──────────────────────
  console.log('Step 3 — Creating Package 1 studentPackages record...');
  const existing = pkgSnap.docs.find(d => d.data().purchaseDate?.startsWith('2025-10'));
  if (existing) {
    console.log(`  ⚠️  A package with Oct 2025 purchaseDate already exists (${existing.id}) — skipping creation.\n`);
  } else {
    const ref = db.collection('studentPackages').doc();
    await ref.set({
      studentId:      ARINA_ID,
      courseId:       FP_ID,
      courseTitle,
      totalHours:     10,
      hoursRemaining: 0,
      price:          285.12,
      currency:       'EUR',
      purchaseDate:   '2025-10-21',
      expiresAt:      '2026-04-21T00:00:00.000Z',
      isPaused:       false,
      totalDaysPaused: 0,
      pauseCount:     0,
      status:         'completed',
      source:         'backfill',
      notes:          'Fun Phonics 10-Pack (30min) · Package 1 · Oct 2025 – Jan 2026',
      createdAt:      Timestamp.now(),
      updatedAt:      Timestamp.now(),
    });
    console.log(`  ✓ Package 1 created: ${ref.id}\n`);
  }

  // ── Step 4: Fix Package 2 hoursRemaining ─────────────────────────────────
  console.log('Step 4 — Updating Package 2 hoursRemaining to 1...');
  // Package 2 is the active one (purchaseDate in 2026)
  const p2 = pkgSnap.docs.find(d => !d.data().purchaseDate?.startsWith('2025-10'));
  if (!p2) {
    console.log('  ⚠️  Could not find Package 2 — skipping.\n');
  } else {
    const current = p2.data();
    console.log(`  Current: hoursRemaining=${current.hoursRemaining}, status=${current.status}`);
    await p2.ref.update({
      hoursRemaining: 1,
      updatedAt: Timestamp.now(),
    });
    console.log(`  ✓ Package 2 (${p2.id}) hoursRemaining updated to 1\n`);
  }

  console.log('═══════════════════════════════════════════════');
  console.log(' Done. Verify at /t-portal/students/iaWH8v359kXT3qMTuIwT7OHpCRJ2');
  console.log('═══════════════════════════════════════════════');
}

run().catch(console.error);
