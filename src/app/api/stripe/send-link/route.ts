// src/app/api/stripe/send-link/route.ts — Generate Stripe Payment Link
import { NextRequest, NextResponse } from 'next/server';
import { stripe, getProductName } from '@/lib/stripe-config';
import { calculatePrice, PackageType, Duration } from '@/lib/pricing';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { packageType, duration, studentId, studentEmail, courseId, courseTitle } = body as {
      packageType: PackageType;
      duration: Duration;
      studentId: string;
      studentEmail: string;
      courseId: string;
      courseTitle: string;
    };

    if (!packageType || !duration || !studentId || !studentEmail || !courseId || !courseTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const priceCalc = calculatePrice(packageType, duration);
    const productName = getProductName(courseTitle, packageType, duration);

    // Create Checkout Session with 24-hour expiry
    const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours from now

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: studentEmail,
      expires_at: expiresAt,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            unit_amount: priceCalc.totalCents,
            product_data: {
              name: productName,
              description: `${priceCalc.sessions} sessions · ${priceCalc.hours} hours · includes 3% processing fee`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        studentId,
        courseId,
        courseTitle,
        packageType,
        duration: String(duration),
        hours: String(priceCalc.hours),
        sessions: String(priceCalc.sessions),
        subtotal: String(priceCalc.subtotal),
        processingFee: String(priceCalc.processingFee),
      },
      success_url: `${req.nextUrl.origin}/s-portal/packages?payment=success`,
      cancel_url: `${req.nextUrl.origin}/s-portal/packages?payment=cancelled`,
    });

    // Return the URL — T copies and sends manually for MVP
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe send-link error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment link' },
      { status: 500 }
    );
  }
}
