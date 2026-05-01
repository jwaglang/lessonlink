/**
 * Rollback Arina's Stripe test payment (NBHZHessl0UUfnN66wmW)
 *
 * Deletes:
 *   - Payment: NBHZHessl0UUfnN66wmW
 *   - StudentPackage: Qc2WlM7eSr4RqOQSnbLM
 *
 * Adjusts:
 *   - StudentCredit: YO7UpHtqYmv03jbwHaWQ (-10 hours)
 *
 * Usage:
 *   npx tsx scripts/rollback-arina-stripe-payment.ts --dry-run
 *   npx tsx scripts/rollback-arina-stripe-payment.ts --delete
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

// ── Known IDs ───────────────────────────────────────────────────────────────────

const ARINA_ID         = 'iaWH8v359kXT3qMTuIwT7OHpCRJ2';
const PAYMENT_ID       = 'NBHZHessl0UUfnN66wmW';
const COURSE_ID        = 'top-up';
const TARGET_PACKAGE_ID = 'Qc2WlM7eSr4RqOQSnbLM';  // test mode studentPackage
const TARGET_CREDIT_ID  = 'YO7UpHtqYmv03jbwHaWQ';   // credit to adjust (-10h)

// Hours added by this test payment
const HOURS_TO_SUBTRACT = 10;

// ── Helpers ─────────────────────────────────────────────────────────────────────

async function deleteDoc(collection: string, docId: string): Promise<boolean> {
  const doc = await db.collection(collection).doc(docId).get();
  if (!doc.exists) {
    console.log(`  ${collection}/${docId}: not found`);
    return false;
  }
  if (process.argv.includes('--delete')) {
    await doc.ref.delete();
    console.log(`  ${collection}/${docId} → deleted`);
  } else {
    console.log(`  [DRY RUN] ${collection}/${docId} would be deleted`);
  }
  return true;
}

// ── Main ─────────────────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const doDelete  = process.argv.includes('--delete');

  if (!isDryRun && !doDelete) {
    console.log('Usage:');
    console.log('  --dry-run   preview changes');
    console.log('  --delete    execute rollback\n');
    process.exit(1);
  }

  console.log(`\n🔍 Rolling back test payment ${PAYMENT_ID}\n`);

  // ── Step 1: Verify payment ────────────────────────────────────────────────────
  const paymentDoc = await db.collection('payments').doc(PAYMENT_ID).get();
  if (!paymentDoc.exists) {
    console.log(`❌ Payment ${PAYMENT_ID} not found!`);
    return;
  }
  const payment = paymentDoc.data();
  console.log('Payment found:');
  console.log(`  amount:    ${payment.amount} ${payment.currency}`);
  console.log(`  method:    ${payment.method} (${payment.stripeSessionId})`);
  console.log(`  status:    ${payment.status}`);
  console.log(`  date:      ${payment.paymentDate}`);

  // ── Step 2: Verify studentPackage ────────────────────────────────────────────
  const pkgDoc = await db.collection('studentPackages').doc(TARGET_PACKAGE_ID).get();
  if (!pkgDoc.exists) {
    console.log(`❌ StudentPackage ${TARGET_PACKAGE_ID} not found!`);
    return;
  }
  const pkg = pkgDoc.data();
  console.log(`\nStudentPackage found:`);
  console.log(`  ID:        ${TARGET_PACKAGE_ID}`);
  console.log(`  hours:     ${pkg.totalHours}`);
  console.log(`  price:     ${pkg.price} ${pkg.currency}`);
  console.log(`  source:    ${pkg.source}`);
  console.log(`  purchase:  ${pkg.purchaseDate}`);

  if (pkg.studentId !== ARINA_ID) {
    console.log(`⚠️  Package studentId mismatch! Expected ${ARINA_ID}, got ${pkg.studentId}`);
  }

  // ── Step 3: Verify studentCredit ─────────────────────────────────────────────
  const creditDoc = await db.collection('studentCredit').doc(TARGET_CREDIT_ID).get();
  if (!creditDoc.exists) {
    console.log(`❌ StudentCredit ${TARGET_CREDIT_ID} not found!`);
    return;
  }
  const credit = creditDoc.data();
  console.log(`\nStudentCredit found:`);
  console.log(`  ID:              ${TARGET_CREDIT_ID}`);
  console.log(`  studentId:       ${credit.studentId}`);
  console.log(`  courseId:        ${credit.courseId || '(none)'}`);
  console.log(`  totalHours:      ${credit.totalHours}`);
  console.log(`  uncommitted:     ${credit.uncommittedHours}`);
  console.log(`  packageId:       ${credit.packageId || '(none)'}`);
  console.log(`  updatedAt:       ${credit.updatedAt}`);

  if ((credit.uncommittedHours ?? 0) < HOURS_TO_SUBTRACT) {
    console.log(`\n⚠️  Warning: uncommitted hours (${credit.uncommittedHours}) < ${HOURS_TO_SUBTRACT}.`);
  }

  // ── Step 4: Summary ───────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('PLANNED CHANGES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  DELETE  payments/${PAYMENT_ID}`);
  console.log(`  DELETE  studentPackages/${TARGET_PACKAGE_ID}`);
  console.log(`  UPDATE  studentCredit/${TARGET_CREDIT_ID}:`);
  console.log(`            totalHours:      ${credit.totalHours} → ${credit.totalHours - HOURS_TO_SUBTRACT}`);
  console.log(`            uncommittedHours: ${credit.uncommittedHours} → ${credit.uncommittedHours - HOURS_TO_SUBTRACT}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (isDryRun) {
    console.log('🧪 DRY RUN — no changes made.\n');
    return;
  }

  // ── Step 5: Execute ────────────────────────────────────────────────────────────
  console.log('🗑️  Executing rollback...\n');

  // Update studentCredit first (subtract hours)
  const newTotal = (credit.totalHours ?? 0) - HOURS_TO_SUBTRACT;
  const newUncommitted = (credit.uncommittedHours ?? 0) - HOURS_TO_SUBTRACT;
  await creditDoc.ref.update({
    totalHours: newTotal,
    uncommittedHours: newUncommitted,
    updatedAt: new Date().toISOString(),
  });
  console.log(`  studentCredit/${TARGET_CREDIT_ID} updated:`);
  console.log(`    totalHours:      ${credit.totalHours} → ${newTotal}`);
  console.log(`    uncommittedHours: ${credit.uncommittedHours} → ${newUncommitted}`);

  // Delete studentPackage
  await pkgDoc.ref.delete();
  console.log(`  studentPackages/${TARGET_PACKAGE_ID} → deleted`);

  // Delete payment
  await paymentDoc.ref.delete();
  console.log(`  payments/${PAYMENT_ID} → deleted`);

  console.log('\n✅ Rollback complete.');
  console.log('\nAfter this, the live payment Q1wTFBu73gaeLTsqyWgn will be "Package 3".');
  console.log('\nNote: If this was a real Stripe payment, also refund it via Stripe dashboard.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
