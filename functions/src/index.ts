import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
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

// ─────────────────────────────────────────────────────────────────────────────
// denormalizeNames
//
// Firestore onWrite trigger for collections that store studentId / teacherUid.
// When either field is present, looks up the display name and writes
// studentName / teacherName onto the same document so manual Firebase Console
// inspection always shows a human-readable name alongside the UID.
//
// Collections watched: sessionInstances, studentPackages, studentCredit,
//   payments, studentProgress, approvalRequests
// ─────────────────────────────────────────────────────────────────────────────

async function resolveNames(
  data: admin.firestore.DocumentData,
  ref: admin.firestore.DocumentReference
): Promise<void> {
  const updates: Record<string, string> = {};

  if (data.studentId && data.studentName === undefined) {
    const studentSnap = await db.collection('students').doc(data.studentId).get();
    if (studentSnap.exists) {
      const name = (studentSnap.data() as any).name as string | undefined;
      if (name) updates.studentName = name;
    }
  }

  if (data.teacherUid && data.teacherName === undefined) {
    const teacherSnap = await db.collection('teacherProfiles').doc(data.teacherUid).get();
    if (teacherSnap.exists) {
      const name = (teacherSnap.data() as any).name as string | undefined;
      if (name) updates.teacherName = name;
    }
  }

  if (Object.keys(updates).length > 0) {
    await ref.update(updates);
  }
}

const WATCHED_COLLECTIONS = [
  'sessionInstances',
  'studentPackages',
  'studentCredit',
  'payments',
  'studentProgress',
  'approvalRequests',
];

export const denormalizeNames = onDocumentWritten(
  { document: '{collection}/{docId}' },
  async (event) => {
    const collection = event.params.collection;
    if (!WATCHED_COLLECTIONS.includes(collection)) return;

    const after = event.data?.after;
    if (!after?.exists) return;

    const data = after.data() as admin.firestore.DocumentData;
    await resolveNames(data, after.ref);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// backfillStudentRecords
//
// Admin-callable function. Audits and repairs records for a list of studentIds.
// For each student:
//   - Ensures students doc has status + isNewStudent
//   - If studentCredit exists but studentPackages is missing, creates it
//   - If studentPackages exists but studentCredit is missing, creates it
// Returns a report of what was found / created for each student.
// ─────────────────────────────────────────────────────────────────────────────

export const backfillStudentRecords = onCall(
  { enforceAppCheck: false, cors: true },
  async (request) => {
    if (request.auth?.token?.email !== 'jwag.lang@gmail.com') {
      throw new Error('Unauthorized: Admin only');
    }

    // Fetch all active students automatically
    const activeSnap = await db.collection('students').where('status', '==', 'active').get();
    const studentIds = activeSnap.docs.map((d) => d.id);
    if (studentIds.length === 0) {
      return { success: true, report: {}, message: 'No active students found' };
    }
    logger.info('backfillStudentRecords: running on active students', { count: studentIds.length });

    const now = new Date().toISOString();
    const report: Record<string, string[]> = {};

    for (const studentId of studentIds) {
      const actions: string[] = [];
      report[studentId] = actions;

      // ── students doc ──────────────────────────────────────────────────────
      const studentRef = db.collection('students').doc(studentId);
      const studentSnap = await studentRef.get();

      if (!studentSnap.exists) {
        actions.push('ERROR: students doc not found — skipping');
        continue;
      }

      const studentData = studentSnap.data() as any;
      const studentName: string = studentData.name ?? '(unknown)';
      const studentUpdates: Record<string, any> = {};

      if (!studentData.status) {
        studentUpdates.status = 'active';
        actions.push('students: added status=active');
      }
      if (studentData.isNewStudent === undefined) {
        studentUpdates.isNewStudent = false;
        actions.push('students: added isNewStudent=false');
      }
      if (Object.keys(studentUpdates).length > 0) {
        studentUpdates.updatedAt = now;
        await studentRef.update(studentUpdates);
      } else {
        actions.push('students: ok');
      }

      // ── studentCredit ─────────────────────────────────────────────────────
      const creditSnap = await db
        .collection('studentCredit')
        .where('studentId', '==', studentId)
        .get();

      // ── studentPackages ───────────────────────────────────────────────────
      const packageSnap = await db
        .collection('studentPackages')
        .where('studentId', '==', studentId)
        .get();

      if (!creditSnap.empty && packageSnap.empty) {
        // Create studentPackages from studentCredit data
        for (const creditDoc of creditSnap.docs) {
          const c = creditDoc.data() as any;
          const hoursRemaining = (c.uncommittedHours ?? 0) + (c.committedHours ?? 0);
          // Look up course title
          let courseTitle = '';
          if (c.courseId) {
            const courseSnap = await db.collection('courses').doc(c.courseId).get();
            if (courseSnap.exists) courseTitle = (courseSnap.data() as any).title ?? '';
          }
          const pkgRef = db.collection('studentPackages').doc();
          await pkgRef.set({
            studentId,
            studentName,
            courseId: c.courseId ?? '',
            courseTitle,
            totalHours: c.totalHours ?? 0,
            hoursRemaining,
            price: 0,
            currency: c.currency ?? 'EUR',
            purchaseDate: c.createdAt ?? now,
            status: 'active',
            isPaused: false,
            pauseCount: 0,
            totalDaysPaused: 0,
            source: 'backfill',
            createdAt: c.createdAt ?? now,
            updatedAt: now,
          });
          // Link the credit back to this package
          await creditDoc.ref.update({ packageId: pkgRef.id, updatedAt: now });
          actions.push(`studentPackages: created ${pkgRef.id} from credit ${creditDoc.id}`);
        }
      } else if (!packageSnap.empty && creditSnap.empty) {
        // Create studentCredit from studentPackages data
        for (const pkgDoc of packageSnap.docs) {
          const p = pkgDoc.data() as any;
          const creditRef = db.collection('studentCredit').doc();
          await creditRef.set({
            studentId,
            studentName,
            courseId: p.courseId ?? '',
            packageId: pkgDoc.id,
            totalHours: p.totalHours ?? 0,
            uncommittedHours: p.hoursRemaining ?? 0,
            committedHours: 0,
            completedHours: (p.totalHours ?? 0) - (p.hoursRemaining ?? 0),
            currency: p.currency ?? 'EUR',
            createdAt: p.createdAt ?? now,
            updatedAt: now,
          });
          actions.push(`studentCredit: created ${creditRef.id} from package ${pkgDoc.id}`);
        }
      } else if (creditSnap.empty && packageSnap.empty) {
        actions.push('studentCredit: none found');
        actions.push('studentPackages: none found');
      } else {
        actions.push(`studentCredit: ${creditSnap.size} doc(s) ok`);
        actions.push(`studentPackages: ${packageSnap.size} doc(s) ok`);
        // Backfill missing studentName on existing docs
        for (const doc of [...creditSnap.docs, ...packageSnap.docs]) {
          if (!doc.data().studentName) {
            await doc.ref.update({ studentName, updatedAt: now });
            actions.push(`${doc.ref.parent.id}/${doc.id}: added studentName`);
          }
        }
      }
    }

    logger.info('backfillStudentRecords: complete', { report });
    return { success: true, report };
  }
);
