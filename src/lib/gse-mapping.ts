// ========================================
// GSE Band Mapping Utility
// Maps observed assessment scores to suggested GSE bands
// Based on Pearson Global Scale of English for Young Learners
// ========================================

import type { GseBand } from './types';

interface GseBandEntry extends GseBand {
  scoreRange: [number, number]; // average score range (1-5 scale)
}

// ========================================
// GSE Band Table
// ========================================

const GSE_BANDS: GseBandEntry[] = [
  { min: 10, max: 17, cefr: 'Below A1',     cambridge: 'Pre-A1 Starters (lower)',              scoreRange: [1.0, 1.4] },
  { min: 18, max: 24, cefr: 'Pre-A1 / A1',  cambridge: 'Pre-A1 Starters',                     scoreRange: [1.5, 2.0] },
  { min: 25, max: 29, cefr: 'A1',            cambridge: 'A1 Movers',                            scoreRange: [2.1, 2.7] },
  { min: 30, max: 35, cefr: 'A2',            cambridge: 'A2 Flyers',                            scoreRange: [2.8, 3.3] },
  { min: 36, max: 42, cefr: 'A2+',           cambridge: 'A2 Flyers (high) / A2 Key for Schools', scoreRange: [3.4, 3.8] },
  { min: 43, max: 50, cefr: 'B1',            cambridge: 'B1 Preliminary for Schools',            scoreRange: [3.9, 4.3] },
  { min: 51, max: 58, cefr: 'B1+',           cambridge: 'B1 Preliminary for Schools (high)',     scoreRange: [4.4, 4.7] },
  { min: 59, max: 66, cefr: 'B2',            cambridge: 'B2 First for Schools',                  scoreRange: [4.8, 5.0] },
];

// ========================================
// Map scores to GSE band
// ========================================

/**
 * Maps an average assessment score (1-5) to a suggested GSE band.
 * This is a rough heuristic — T should always review and adjust.
 *
 * @param avgScore - Average of communicativeEffectiveness, emergentLanguageComplexity, fluency (1-5)
 * @returns GseBand or null if score is out of range
 */
export function mapScoreToGseBand(avgScore: number): GseBand | null {
  if (avgScore < 1 || avgScore > 5) return null;

  for (const band of GSE_BANDS) {
    if (avgScore >= band.scoreRange[0] && avgScore <= band.scoreRange[1]) {
      return {
        min: band.min,
        max: band.max,
        cefr: band.cefr,
        cambridge: band.cambridge,
      };
    }
  }

  // If above all ranges, return highest band
  const highest = GSE_BANDS[GSE_BANDS.length - 1];
  return {
    min: highest.min,
    max: highest.max,
    cefr: highest.cefr,
    cambridge: highest.cambridge,
  };
}

/**
 * Format a GSE band for display.
 * e.g. "GSE 25-29 (≈ CEFR A1 · Cambridge A1 Movers)"
 */
export function formatGseBand(band: GseBand): string {
  return `GSE ${band.min}-${band.max} (≈ CEFR ${band.cefr} · Cambridge ${band.cambridge})`;
}

/**
 * Calculate the average of the three numeric TBLT dimensions.
 */
export function calculateDimensionAverage(
  communicativeEffectiveness: number,
  emergentLanguageComplexity: number,
  fluency: number
): number {
  return Number(((communicativeEffectiveness + emergentLanguageComplexity + fluency) / 3).toFixed(2));
}

/**
 * Convenience: map three dimension scores directly to a GSE band.
 */
export function mapDimensionsToGseBand(
  communicativeEffectiveness: number,
  emergentLanguageComplexity: number,
  fluency: number
): GseBand | null {
  const avg = calculateDimensionAverage(communicativeEffectiveness, emergentLanguageComplexity, fluency);
  return mapScoreToGseBand(avg);
}
