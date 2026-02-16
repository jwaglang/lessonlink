// src/app/api/stripe/webhook/route.ts — Stripe Webhook Handler
import { NextRequest, NextResponse } from 'next/server';
import { stripe, PACKAGE_EXPIRY_MONTHS } from '@/lib/stripe-config';
import { PackageType } from '@/lib/pricing';
import {
  createPayment,
  createStudentPackage,
  createStudentCredit,
  getStudentCredit,
  updateStudentCredit,
} from '@/lib/firestore';

// Disable Next.js body parsing — Stripe needs the raw body for signature verification
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

    if (!metadata?.studentId || !metadata?.courseId) {
      console.error('Webhook missing required metadata:', metadata);
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    const packageType = metadata.packageType as PackageType;
    const hours = Number(metadata.hours);
    const sessions = Number(metadata.sessions);
    const amountTotal = (session.amount_total ?? 0) / 100;
    const currency = (session.currency ?? 'eur').toUpperCase();

    try {
      // 1. Create Payment record
      await createPayment({
        studentId: metadata.studentId,
        courseId: metadata.courseId,
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
        notes: `${metadata.courseTitle} — ${packageType} (${metadata.duration}min)`,
      });

      // 2. Create StudentPackage record
      const expiryMonths = PACKAGE_EXPIRY_MONTHS[packageType] ?? 6;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + expiryMonths);

      const newPackage = await createStudentPackage({
        studentId: metadata.studentId,
        courseId: metadata.courseId,
        courseTitle: metadata.courseTitle,
        totalHours: hours,
        hoursRemaining: hours,
        price: amountTotal,
        currency,
        purchaseDate: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        isPaused: false,
        pausedAt: undefined,
        pauseReason: undefined,
        totalDaysPaused: 0,
        pauseCount: 0,
        status: 'active',
      });

      // 3. Create or update StudentCredit
      const existingCredit = await getStudentCredit(metadata.studentId, metadata.courseId);
      if (existingCredit) {
        await updateStudentCredit(existingCredit.id, {
          totalHours: existingCredit.totalHours + hours,
          uncommittedHours: existingCredit.uncommittedHours + hours,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await createStudentCredit({
          studentId: metadata.studentId,
          courseId: metadata.courseId,
          packageId: newPackage.id,
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
