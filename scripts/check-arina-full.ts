/**
 * Diagnostic: Show all of Arina's payments and studentPackages side-by-side
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

function parseDate(ts: any): string {
  if (!ts) return '(none)';
  if (ts.toDate) return ts.toDate().toISOString();
  return String(ts);
}

async function main() {
  console.log('\n=== Arina: Payments ===\n');
  const paymentsSnap = await db.collection('payments')
    .where('studentId', '==', ARINA_ID)
    .orderBy('paymentDate', 'desc')
    .get();

  for (const doc of paymentsSnap.docs) {
    const d = doc.data();
    console.log(`Payment ID:   ${doc.id}`);
    console.log(`  amount:      ${d.amount} ${d.currency}`);
    console.log(`  type:        ${d.type}`);
    console.log(`  method:      ${d.method}`);
    console.log(`  status:      ${d.status}`);
    console.log(`  paymentDate: ${d.paymentDate}`);
    console.log(`  stripeSessionId: ${d.stripeSessionId || '(none)'}`);
    console.log(`  stripePaymentIntentId: ${d.stripePaymentIntentId || '(none)'}`);
    console.log('');
  }

  console.log('\n=== Arina: StudentPackages ===\n');
  const pkgsSnap = await db.collection('studentPackages')
    .where('studentId', '==', ARINA_ID)
    .orderBy('purchaseDate', 'desc')
    .get();

  for (const doc of pkgsSnap.docs) {
    const d = doc.data();
    console.log(`Package ID:   ${doc.id}`);
    console.log(`  courseId:    ${d.courseId}`);
    console.log(`  totalHours:  ${d.totalHours}`);
    console.log(`  price:       ${d.price} ${d.currency}`);
    console.log(`  source:      ${d.source}`);
    console.log(`  purchaseDate: ${parseDate(d.purchaseDate)}`);
    console.log(`  expiresAt:    ${parseDate(d.expiresAt)}`);
    console.log('');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
