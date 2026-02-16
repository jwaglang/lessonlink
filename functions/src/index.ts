import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
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
