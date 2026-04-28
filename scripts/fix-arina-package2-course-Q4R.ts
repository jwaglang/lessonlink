/**
 * Update Arina's Package 2 studentPackages record to Fast Fluency — Q4R
 *
 * Package 2 (Feb 2026 onward) is when Fast Fluency started.
 * The Stripe webhook originally tagged it as Fun Phonics; this corrects it.
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
const FF_ID    = '45Jkyfg94otjc4d22dZT';

async function run() {
  console.log('═══════════════════════════════════════════════');
  console.log(' Fix Arina Package 2 → Fast Fluency — Q4R');
  console.log('═══════════════════════════════════════════════\n');

  // Resolve FF course title
  const courseSnap = await db.collection('courses').doc(FF_ID).get();
  const courseTitle = courseSnap.exists ? (courseSnap.data()?.title ?? 'Fast Fluency') : 'Fast Fluency';
  console.log(`FF course title: "${courseTitle}"`);

  // Find Package 2 (the active one, purchaseDate in 2026, not Oct 2025)
  const pkgSnap = await db.collection('studentPackages')
    .where('studentId', '==', ARINA_ID)
    .get();

  const p2 = pkgSnap.docs
    .filter(d => !d.data().purchaseDate?.startsWith('2025-10'))
    .sort((a, b) => b.data().purchaseDate.localeCompare(a.data().purchaseDate))[0];

  if (!p2) {
    console.log('Could not find Package 2 — aborting.');
    return;
  }

  console.log(`\nFound Package 2: ${p2.id}`);
  console.log(`  Current courseTitle: "${p2.data().courseTitle}"`);
  console.log(`  Current courseId: ${p2.data().courseId}`);

  await p2.ref.update({
    courseId:    FF_ID,
    courseTitle,
    updatedAt:   Timestamp.now(),
  });

  console.log(`\n✓ Updated to courseTitle="${courseTitle}", courseId=${FF_ID}`);
  console.log('\n═══════════════════════════════════════════════');
  console.log(' Done. Verify at /t-portal/students/iaWH8v359kXT3qMTuIwT7OHpCRJ2');
  console.log('═══════════════════════════════════════════════');
}

run().catch(console.error);
