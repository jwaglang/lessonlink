// src/lib/pricing.ts — LessonLink Pricing Engine
// Calculates package prices dynamically (no pre-created Stripe products)
// Source of truth: lessonlink-pricing-scheme-v_2.md

// Base rates (Kiddoland EUR)
const BASE_RATES = {
  30: 15.84, // 30-min lesson base price
  60: 31.68, // 60-min lesson base price (exactly 2x, no duration discount)
} as const;

const DISCOUNTS = {
  single: 0,
  '10-pack': 0.10,
  'full-course': 0.20,
} as const;

const SESSIONS_PER_PACKAGE = {
  single: { 30: 1, 60: 1 },
  '10-pack': { 30: 10, 60: 10 },
  'full-course': { 30: 120, 60: 60 }, // both = 60 hours total
} as const;

const PROCESSING_FEE_RATE = 0.03; // 3% Stripe processing fee

export type PackageType = 'single' | '10-pack' | 'full-course';
export type Duration = 30 | 60;

export interface PriceCalculation {
  packageType: PackageType;
  duration: Duration;
  sessions: number;
  hours: number;
  basePerLesson: number;
  discountedPerLesson: number;
  subtotal: number;
  processingFee: number;
  total: number;
  totalCents: number;
  discountPercent: number;
}

export function calculatePrice(packageType: PackageType, duration: Duration): PriceCalculation {
  const basePerLesson = BASE_RATES[duration];
  const discount = DISCOUNTS[packageType];
  const sessions = SESSIONS_PER_PACKAGE[packageType][duration];
  const hours = duration === 30 ? sessions * 0.5 : sessions;

  const discountedPerLesson = +(basePerLesson * (1 - discount)).toFixed(2);
  const subtotal = +(discountedPerLesson * sessions).toFixed(2);
  const processingFee = +(subtotal * PROCESSING_FEE_RATE).toFixed(2);
  const total = +(subtotal + processingFee).toFixed(2);
  const totalCents = Math.round(total * 100);

  return {
    packageType,
    duration,
    sessions,
    hours,
    basePerLesson,
    discountedPerLesson,
    subtotal,
    processingFee,
    total,
    totalCents,
    discountPercent: discount * 100,
  };
}
