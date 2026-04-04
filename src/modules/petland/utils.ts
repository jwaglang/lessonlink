import type { Dorks } from './types';

export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const COPPER_PER_SILVER = 10;
const SILVER_PER_GOLD = 10;

export function dorksToCopper(dorks: Dorks): number {
  if (!dorks) return 0;
  return ((dorks.gold || 0) * SILVER_PER_GOLD + (dorks.silver || 0)) * COPPER_PER_SILVER + (dorks.copper || 0);
}

export function copperToDorks(totalCopper: number): Dorks {
  let remaining = Math.floor(totalCopper);
  const gold = Math.floor(remaining / (SILVER_PER_GOLD * COPPER_PER_SILVER));
  remaining %= SILVER_PER_GOLD * COPPER_PER_SILVER;
  const silver = Math.floor(remaining / COPPER_PER_SILVER);
  remaining %= COPPER_PER_SILVER;
  return { gold, silver, copper: remaining };
}

export function addDorks(current: Dorks, copperToAdd: number): Dorks {
  return copperToDorks(dorksToCopper(current) + copperToAdd);
}

export function subtractDorks(current: Dorks, copperToSubtract: number): Dorks {
  return copperToDorks(Math.max(0, dorksToCopper(current) - copperToSubtract));
}

export function convertXpToDorks(xp: number): number {
  return xp;
}
