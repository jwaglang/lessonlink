/**
 * Force-update Arina's payment with correct invoice values
 * Invoice 0498B29B-0030 amounts:
 *   Total: €293.67
 *   Subtotal: €285.12 (after 10% discount)
 *   Processing Fee: €8.55 (3% on €285.12)
 */

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

async function fixArinaPayment() {
  const studentId = 'iaWH8v359kXT3qMTuIwT7OHpCRJ2';

  console.log('Fixing Arina\'s payment to match invoice 0498B29B-0030...\n');

  const paymentsSnapshot = await db
    .collection('payments')
    .where('studentId', '==', studentId)
    .where('method', '==', 'stripe')
    .limit(1)
    .get();

  if (paymentsSnapshot.empty) {
    console.log('No Stripe payment found.');
    return;
  }

  const paymentDoc = paymentsSnapshot.docs[0];
  const data = paymentDoc.data();

  console.log(`Found payment: ${paymentDoc.id}`);
  console.log(`  Current amount: €${data.amount}`);
  console.log(`  Current subtotal: €${data.subtotal}`);
  console.log(`  Current fee: €${data.processingFee}`);
  console.log('');

  // Correct values from PDF invoice
  const correctAmount = 293.67;
  const correctSubtotal = 285.12;
  const correctFee = 8.55;

  console.log('Setting correct values from invoice:');
  console.log(`  Total: €${correctAmount}`);
  console.log(`  Subtotal: €${correctSubtotal}`);
  console.log(`  Processing fee: €${correctFee}`);
  console.log('');

  await paymentDoc.ref.update({
    amount: correctAmount,
    subtotal: correctSubtotal,
    processingFee: correctFee,
    notes: 'Fun Phonics 10-Pack — 10-pack (60min) · 10% Goal Pack discount applied',
  });

  console.log('✅ Payment updated successfully!');
  console.log(`   Verify at: /t-portal/students/${studentId}`);
}

fixArinaPayment().catch(console.error);
