// src/app/api/stripe/webhook/route.ts — Stripe Webhook Handler (Admin SDK)
import { NextRequest, NextResponse } from 'next/server';
import { stripe, PACKAGE_EXPIRY_MONTHS } from '@/lib/stripe-config';
import { PackageType } from '@/lib/pricing';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata;

    if (!metadata?.studentId) {
      console.error('Webhook missing required metadata:', metadata);
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    const resolvedCourseId = metadata.courseId || 'top-up';
    const resolvedCourseTitle = metadata.courseTitle || 'Top Up Credit';

    const packageType = metadata.packageType as PackageType;
    const hours = Number(metadata.hours);
    const sessions = Number(metadata.sessions);
    const amountTotal = (session.amount_total ?? 0) / 100;
    const currency = (session.currency ?? 'eur').toUpperCase();

    try {
      // 1. Create Payment record
      await adminDb.collection('payments').add({
        studentId: metadata.studentId,
        courseId: resolvedCourseId,
        amount: amountTotal,
        currency,
        type: packageType === 'single' ? 'one_off' : 'package',
        method: 'stripe',
        paymentDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: 'completed',
        stripeSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? '',
        notes: `${resolvedCourseTitle} — ${packageType} (${metadata.duration}min)`,
      });

      // 2. Create StudentPackage record
      const expiryMonths = PACKAGE_EXPIRY_MONTHS[packageType] ?? 6;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + expiryMonths);

      const packageRef = await adminDb.collection('studentPackages').add({
        studentId: metadata.studentId,
        courseId: resolvedCourseId,
        courseTitle: resolvedCourseTitle,
        totalHours: hours,
        hoursRemaining: hours,
        price: amountTotal,
        currency,
        purchaseDate: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        isPaused: false,
        totalDaysPaused: 0,
        pauseCount: 0,
        status: 'active',
      });

      // 3. Create or update StudentCredit (course-agnostic — one pool per learner)
      const creditQuery = await adminDb.collection('studentCredit')
        .where('studentId', '==', metadata.studentId)
        .limit(1)
        .get();

      if (!creditQuery.empty) {
        const existingDoc = creditQuery.docs[0];
        const existing = existingDoc.data();
        await existingDoc.ref.update({
          totalHours: (existing.totalHours ?? 0) + hours,
          uncommittedHours: (existing.uncommittedHours ?? 0) + hours,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await adminDb.collection('studentCredit').add({
          studentId: metadata.studentId,
          packageId: packageRef.id,
          totalHours: hours,
          uncommittedHours: hours,
          committedHours: 0,
          completedHours: 0,
          currency,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      console.log(`✅ Stripe webhook processed: ${packageType} for student ${metadata.studentId}`);
    } catch (err) {
      console.error('Webhook processing error:', err);
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
