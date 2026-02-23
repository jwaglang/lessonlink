// src/lib/stripe-config.ts — Stripe client initialization + helpers
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

// Package display labels for Stripe product_data.name
export function getProductName(courseTitle: string, packageType: string, duration: number): string {
  const packageLabel = packageType === 'single' ? 'Single Session'
    : packageType === '10-pack' ? '10-Pack'
    : 'Full Course';
  return `${courseTitle} — ${packageLabel} (${duration}min)`;
}

// Expiration rules (months from purchase)
export const PACKAGE_EXPIRY_MONTHS = {
  single: 3,
  '10-pack': 6,
  'full-course': 12,
} as const;
