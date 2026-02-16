import type { StudentPackage } from './types';

/**
 * Returns the maximum number of pauses allowed for a package.
 * Formula: 1 pause per 20 hours (rounded up).
 *   - 10h = 1 pause
 *   - 20h = 1 pause
 *   - 40h = 2 pauses
 *   - 60h = 3 pauses
 */
export function getMaxPauses(totalHours: number): number {
  return Math.ceil(totalHours / 20);
}

/**
 * Returns true if the package can be paused (has remaining pauses and is active).
 * Does NOT check admin override — that is handled at the UI/call-site level.
 */
export function canPause(pkg: StudentPackage): boolean {
  return pkg.status === 'active' && pkg.pauseCount < getMaxPauses(pkg.totalHours);
}

/** Returns how many pauses remain for a package. */
export function pausesRemaining(pkg: StudentPackage): number {
  return Math.max(0, getMaxPauses(pkg.totalHours) - pkg.pauseCount);
}
