import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

/**
 * checkExpiredPackages
 *
 * Runs daily at midnight UTC.
 * Finds all active (non-paused) student packages whose expiresAt date
 * has passed, marks them as expired, and sends a notification to both
 * the learner and tutor.
 */
export const checkExpiredPackages = onSchedule(
  {
    schedule: 'every day 00:00',
    timeZone: 'UTC',
    retryCount: 1,
  },
  async () => {
    const now = new Date().toISOString();

    logger.info('checkExpiredPackages: Starting scan', { now });

    // Query active packages that have an expiresAt date
    const snapshot = await db
      .collection('studentPackages')
      .where('status', '==', 'active')
      .where('isPaused', '==', false)
      .get();

    if (snapshot.empty) {
      logger.info('checkExpiredPackages: No active packages found');
      return;
    }

    let expiredCount = 0;
    const batch = db.batch();
    const notifications: Array<{
      studentId: string;
      packageName: string;
    }> = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const expiresAt = data.expiresAt as string | null;

      // Skip packages with no expiry
      if (!expiresAt) continue;

      // Check if the package has expired
      if (expiresAt < now) {
        batch.update(doc.ref, {
          status: 'expired',
          updatedAt: admin.firestore.Timestamp.now(),
        });

        notifications.push({
          studentId: data.studentId,
          packageName: data.packageName || 'Unnamed package',
        });

        expiredCount++;
      }
    }

    // Commit all status updates
    if (expiredCount > 0) {
      await batch.commit();
      logger.info(`checkExpiredPackages: Expired ${expiredCount} package(s)`);

      // Send notifications for each expired package
      const notifBatch = db.batch();

      for (const notif of notifications) {
        // Notification to the learner
        const learnerNotifRef = db.collection('messages').doc();
        notifBatch.set(learnerNotifRef, {
          type: 'notification',
          from: 'system',
          fromType: 'system',
          to: notif.studentId,
          toType: 'student',
          content: `Your package "${notif.packageName}" has expired. Please contact your tutor to purchase a new package.`,
          timestamp: now,
          createdAt: now,
          read: false,
          actionLink: '/s-portal/packages',
        });
      }

      await notifBatch.commit();
      logger.info(`checkExpiredPackages: Sent ${notifications.length} expiry notification(s)`);
    } else {
      logger.info('checkExpiredPackages: No packages expired today');
    }
  }
);

/**
 * backfillXpSpentField
 *
 * One-time Cloud Function to add missing xpSpent field to all petland profiles.
 * Callable via HTTPS (requires authentication).
 *
 * Admin-only function (checks if user is jwag.lang@gmail.com).
 * Returns { success: boolean, message: string, updatedCount: number }
 */
export const backfillXpSpentField = onCall(
  {
    enforceAppCheck: false,
    cors: true,
  },
  async (request) => {
    const uid = request.auth?.uid;
    const email = request.auth?.token?.email;

    // Admin check
    if (email !== 'jwag.lang@gmail.com') {
      throw new Error('Unauthorized: Admin only');
    }

    logger.info('backfillXpSpentField: Starting backfill', { email });

    try {
      // Query all students
      const studentsSnapshot = await db.collection('students').get();

      if (studentsSnapshot.empty) {
        logger.info('backfillXpSpentField: No students found');
        return {
          success: true,
          message: 'No students found',
          updatedCount: 0,
        };
      }

      let updatedCount = 0;
      const batch = db.batch();
      let batchOperations = 0;
      const maxBatchSize = 500; // Firestore batch limit

      for (const studentDoc of studentsSnapshot.docs) {
        const studentId = studentDoc.id;

        // Get petland profile
        const profileRef = db
          .collection('students')
          .doc(studentId)
          .collection('petland')
          .doc('profile');

        const profileDoc = await profileRef.get();

        if (!profileDoc.exists) {
          // Profile doesn't exist, skip this student
          continue;
        }

        const data = profileDoc.data();

        // Check if xpSpent field is missing
        if (data && data.xpSpent === undefined) {
          batch.update(profileRef, {
            xpSpent: 0,
            updatedAt: admin.firestore.Timestamp.now(),
          });

          batchOperations++;
          updatedCount++;

          // Commit batch if it reaches size limit
          if (batchOperations >= maxBatchSize) {
            await batch.commit();
            logger.info('backfillXpSpentField: Committed batch', {
              operations: batchOperations,
            });
            batchOperations = 0; // Reset for new batch
          }
        }
      }

      // Commit remaining operations
      if (batchOperations > 0) {
        await batch.commit();
        logger.info('backfillXpSpentField: Committed final batch', {
          operations: batchOperations,
        });
      }

      logger.info('backfillXpSpentField: Backfill complete', {
        updatedCount,
      });

      return {
        success: true,
        message: `Successfully updated ${updatedCount} petland profiles with xpSpent field`,
        updatedCount,
      };
    } catch (error) {
      logger.error('backfillXpSpentField: Error during backfill', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Backfill failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);
