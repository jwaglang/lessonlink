import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

config({ path: '.env.local' });

const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

const app = getApps().length === 0 ? initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey,
  }),
}) : getApps()[0];

const db = getFirestore(app);

async function backfill() {
  const studentsSnap = await db.collection('students').get();
  let created = 0;
  let skipped = 0;

  for (const studentDoc of studentsSnap.docs) {
    const studentId = studentDoc.id;
    const studentData = studentDoc.data();
    const studentName = studentData.name || studentId;

    // Check if already has progress
    const existingProgress = await db.collection('studentProgress')
      .where('studentId', '==', studentId)
      .limit(1)
      .get();

    if (!existingProgress.empty) {
      skipped++;
      continue;
    }

    // Get active package for courseId
    const packagesSnap = await db.collection('studentPackages')
      .where('studentId', '==', studentId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    // Skip if no active package (trial learner without purchase)
    if (packagesSnap.empty) {
      console.log(`Skipped ${studentName} - no active package`);
      skipped++;
      continue;
    }

    const courseId = packagesSnap.docs[0].data().courseId || 'default';

    // Create progress record
    await db.collection('studentProgress').add({
      studentId,
      courseId,
      unitId: 'starter',
      sessionsTotal: 0,
      sessionsCompleted: 0,
      totalHoursCompleted: 0,
      hoursReserved: 0,
      status: 'assigned',
      assignedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`Created progress for ${studentName} (${studentId})`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);
  process.exit(0);
}

backfill();