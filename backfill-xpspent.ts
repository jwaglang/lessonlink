/**
 * Backfill xpSpent field script
 *
 * Run this script to trigger the Cloud Function backfill:
 * npx ts-node backfill-xpspent.ts
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials (Firebase CLI)
admin.initializeApp({
  projectId: 'studio-3824588486-46768',
});

const db = admin.firestore();

/**
 * Main backfill function
 * Directly updates all petland profiles with missing xpSpent field
 */
async function backfillXpSpent() {
  console.log('🚀 Starting xpSpent backfill...\n');

  try {
    // Query all students
    const studentsSnapshot = await db.collection('students').get();

    if (studentsSnapshot.empty) {
      console.log('❌ No students found');
      return;
    }

    console.log(`📊 Found ${studentsSnapshot.size} students\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    const batch = db.batch();
    let batchOperations = 0;
    const maxBatchSize = 500;

    for (const studentDoc of studentsSnapshot.docs) {
      const studentId = studentDoc.id;
      const studentEmail = studentDoc.data().email || 'Unknown';

      // Get petland profile
      const profileRef = db
        .collection('students')
        .doc(studentId)
        .collection('petland')
        .doc('profile');

      const profileDoc = await profileRef.get();

      if (!profileDoc.exists) {
        // Profile doesn't exist - create it with default values
        console.log(`🆕 ${studentEmail} (${studentId}): Creating petland profile`);

        batch.set(profileRef, {
          xp: 0,
          hp: 100,
          maxHp: 100,
          dorkBalance: 0,
          xpSpent: 0,
          lastHpUpdate: new Date().toISOString(),
          lastChallengeDate: '',
          isSick: false,
          petState: 'egg',
          petName: '',
          inventory: [],
          unlockedBrochures: [],
          createdAt: admin.firestore.Timestamp.now(),
        });

        batchOperations++;
        updatedCount++;

        // Commit batch if it reaches size limit
        if (batchOperations >= maxBatchSize) {
          await batch.commit();
          console.log(`   📝 Committed batch (${batchOperations} operations)\n`);
          batchOperations = 0;
        }

        continue;
      }

      const data = profileDoc.data();

      // Check if xpSpent field is missing
      if (data && data.xpSpent === undefined) {
        batch.update(profileRef, {
          xpSpent: 0,
          updatedAt: admin.firestore.Timestamp.now(),
        });

        console.log(
          `✅ ${studentEmail} (${studentId}): Added xpSpent: 0 (current xp: ${data.xp || 0})`
        );

        batchOperations++;
        updatedCount++;

        // Commit batch if it reaches size limit
        if (batchOperations >= maxBatchSize) {
          await batch.commit();
          console.log(`   📝 Committed batch (${batchOperations} operations)\n`);
          batchOperations = 0;
        }
      } else {
        console.log(
          `⏭️  ${studentEmail} (${studentId}): Already has xpSpent (value: ${data?.xpSpent})`
        );
        skippedCount++;
      }
    }

    // Commit remaining operations
    if (batchOperations > 0) {
      await batch.commit();
      console.log(`\n📝 Committed final batch (${batchOperations} operations)`);
    }

    console.log(`\n✨ Backfill complete!`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total: ${updatedCount + skippedCount}`);
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run backfill
backfillXpSpent().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
