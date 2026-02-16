// src/app/api/stripe/checkout/route.ts — Create Stripe Checkout Session
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

    // Validate required fields
    if (!packageType || !duration || !studentId || !studentEmail || !courseId || !courseTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate price dynamically
    const priceCalc = calculatePrice(packageType, duration);
    const productName = getProductName(courseTitle, packageType, duration);

    // Create Stripe Checkout Session with dynamic price_data
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: studentEmail,
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

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
