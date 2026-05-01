/**
 * Diagnostic: Check all studentCredit records for Arina
 */
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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

async function main() {
  console.log('Checking all studentCredit for Arina...\n');

  const snap = await db.collection('studentCredit')
    .where('studentId', '==', ARINA_ID)
    .get();

  if (snap.empty) {
    console.log('No studentCredit records found at all.');
    return;
  }

  console.log(`Found ${snap.size} studentCredit record(s):\n`);
  snap.docs.forEach(d => {
    const data = d.data();
    console.log(`ID:            ${d.id}`);
    console.log(`  studentId:    ${data.studentId}`);
    console.log(`  courseId:     ${data.courseId || '(none)'}`);
    console.log(`  packageId:    ${data.packageId || '(none)'}`);
    console.log(`  totalHours:   ${data.totalHours}`);
    console.log(`  uncommitted:  ${data.uncommittedHours}`);
    console.log(`  committed:    ${data.committedHours}`);
    console.log(`  completed:    ${data.completedHours}`);
    console.log(`  createdAt:    ${data.createdAt}`);
    console.log(`  updatedAt:    ${data.updatedAt}`);
    console.log('');
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
