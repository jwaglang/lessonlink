/**
 * Migration: Backfill subtotal and processingFee for existing Stripe payments
 *
 * For each Stripe payment record missing these fields:
 * - subtotal = amount / 1.03 (reverse-engineering 3% fee)
 * - processingFee = amount - subtotal
 *
 * Run: npx tsx scripts/backfill-payment-fees.ts
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

// Load environment variables
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

async function backfillPaymentFees() {
  console.log('Starting payment fee backfill...');

  // Get all payments (no student grouping needed)
  const paymentsSnapshot = await db.collection('payments').get();
  const payments = paymentsSnapshot.docs;

  console.log(`Found ${payments.length} total payments`);

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const paymentDoc of payments) {
    const data = paymentDoc.data();
    const paymentId = paymentDoc.id;

    // Only process Stripe payments that lack subtotal/processingFee
    if (data.method !== 'stripe') continue;
    if (data.subtotal !== undefined && data.processingFee !== undefined) continue;

    const amount = data.amount;
    if (!amount || amount <= 0) {
      console.log(`  Skipping payment ${paymentId}: invalid amount`);
      totalSkipped++;
      continue;
    }

    // Reverse-calculate: subtotal = total / 1.03, fee = total - subtotal
    const subtotal = +(amount / 1.03).toFixed(2);
    const processingFee = +(amount - subtotal).toFixed(2);

    // Update Firestore
    await paymentDoc.ref.update({
      subtotal,
      processingFee,
    });

    console.log(`  Updated ${paymentId}: €${amount} → subtotal: €${subtotal}, fee: €${processingFee}`);
    totalUpdated++;
  }

  console.log(`\n✅ Complete. Updated ${totalUpdated} Stripe payments, skipped ${totalSkipped}.`);
}

backfillPaymentFees().catch(console.error);
