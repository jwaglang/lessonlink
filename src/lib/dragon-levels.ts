import type { DragonLevel } from './types';

export interface DragonLevelInfo {
  key: DragonLevel;
  label: string;        // e.g. "Yellow Dragon"
  color: string;        // Tailwind color class for badges/display
  gseRange: string;     // e.g. "22-29"
  cefr: string;         // e.g. "A1-A2"
  cambridge: string;    // e.g. "Starters-Movers"
  stage: string;        // e.g. "Primary Low"
  description: string;  // Brief description of what the learner can do
}

export const DRAGON_LEVELS: DragonLevelInfo[] = [
  {
    key: 'egg',
    label: 'Egg Dragon',
    color: 'bg-stone-200 text-stone-800',
    gseRange: '—',
    cefr: 'Pre-A1',
    cambridge: '—',
    stage: 'Phonics / Pre-Literacy',
    description: 'Alphabet, phonemic awareness, letter-sound correspondence. Parallel to or precedes White. Not GSE-scored.',
  },
  {
    key: 'white',
    label: 'White Dragon',
    color: 'bg-gray-100 text-gray-800',
    gseRange: '10-21',
    cefr: 'Pre-A1 – A1',
    cambridge: 'Pre-Starters – Starters',
    stage: 'Pre-Primary / Beginners',
    description: 'Here-and-now. Single words & chunks. Picture stories.',
  },
  {
    key: 'yellow',
    label: 'Yellow Dragon',
    color: 'bg-yellow-100 text-yellow-800',
    gseRange: '22-29',
    cefr: 'A1 – A2',
    cambridge: 'Starters – Movers',
    stage: 'Primary Low',
    description: 'There-and-then emerging. Simple connectors. Extended picture stories.',
  },
  {
    key: 'orange',
    label: 'Orange Dragon',
    color: 'bg-orange-100 text-orange-800',
    gseRange: '30-35',
    cefr: 'A2',
    cambridge: 'Movers',
    stage: 'Primary Mid',
    description: 'Past tense. Sequencing & basic reasoning. Puzzle stories.',
  },
  {
    key: 'green',
    label: 'Green Dragon',
    color: 'bg-green-100 text-green-800',
    gseRange: '36-42',
    cefr: 'A2+ – B1',
    cambridge: 'Movers – Flyers',
    stage: 'Primary High',
    description: 'Mixed narrative + topic texts. Opinion emerging.',
  },
  {
    key: 'blue',
    label: 'Blue Dragon',
    color: 'bg-blue-100 text-blue-800',
    gseRange: '43-50',
    cefr: 'B1 – B1+',
    cambridge: 'Flyers – A2 Key',
    stage: 'Lower Secondary',
    description: 'Inquiry-driven. KWL research cycle. Informational texts.',
  },
  {
    key: 'purple',
    label: 'Purple Dragon',
    color: 'bg-purple-100 text-purple-800',
    gseRange: '51-58',
    cefr: 'B1+ – B2',
    cambridge: 'B1 Preliminary',
    stage: 'Upper Secondary',
    description: 'Big Question inquiry. Complex informational texts. Extended argumentation.',
  },
  {
    key: 'red',
    label: 'Red Dragon',
    color: 'bg-red-100 text-red-800',
    gseRange: '59-64',
    cefr: 'B2',
    cambridge: 'B2 First (lower)',
    stage: 'Advanced YL',
    description: 'Structured academic discourse. Critical analysis of texts. Age-appropriate debate & persuasion.',
  },
  {
    key: 'black',
    label: 'Black Dragon',
    color: 'bg-gray-900 text-gray-100',
    gseRange: '65-75',
    cefr: 'B2+ – C1',
    cambridge: 'B2 First (upper) – C1 Advanced',
    stage: 'Near-Native YL',
    description: 'Autonomous performance. Authentic materials adapted for YL maturity. Rare — bilingual / heritage / long-term immersion learners.',
  },
];

/** Look up a dragon level by its key */
export function getDragonLevel(key: DragonLevel): DragonLevelInfo | undefined {
  return DRAGON_LEVELS.find((l) => l.key === key);
}

/** Messaging app options for dropdowns */
export const MESSAGING_APPS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'wechat', label: 'WeChat' },
  { value: 'kakaotalk', label: 'KakaoTalk' },
  { value: 'line', label: 'LINE' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'other', label: 'Other' },
] as const;

/** Gender options */
export const GENDER_OPTIONS = [
  { value: 'boy', label: 'Boy' },
  { value: 'girl', label: 'Girl' },
  { value: 'other', label: 'Other Identity' },
] as const;

/** Relationship options */
export const RELATIONSHIP_OPTIONS = [
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other', label: 'Other' },
] as const;

/** English proficiency options */
export const ENGLISH_PROFICIENCY_OPTIONS = [
  { value: 'native', label: 'Native' },
  { value: 'fluent', label: 'Fluent' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'basic', label: 'Basic' },
  { value: 'none', label: 'None' },
] as const;

/** Contact method options */
export const CONTACT_METHOD_OPTIONS = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'wechat', label: 'WeChat' },
  { value: 'kakaotalk', label: 'KakaoTalk' },
  { value: 'line', label: 'LINE' },
  { value: 'telegram', label: 'Telegram' },
] as const;

/** Calculate age from birthday string */
export function calculateAge(birthday: string): number {
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/** Check if student is under 18 based on birthday */
export function isMinor(birthday: string): boolean {
  return calculateAge(birthday) < 18;
}
