export type PetState = 'egg' | 'hatched' | 'dead';

export type FeedbackType = 'wow' | 'brainfart' | 'treasure';

export interface Dorks {
  gold: number;
  silver: number;
  copper: number;
}

export interface GeneratedComposite {
  accessories: Array<{
    id: string;                 // accessory ID
    imageUrl: string;           // accessory image URL
  }>;
  imageUrl: string;             // full Storage URL of the composite image
  createdAt: string;            // ISO 8601 timestamp
}

export interface PetlandProfile {
  xp: number;                   // lifetime XP earned, never decreases (progress tracker)
  xpSpent: number;              // total XP converted to Dorks (for display purposes)
  hp: number;
  maxHp: number;
  dorkBalance: number;          // wallet balance in Copper (1 XP = 1 Copper, converted at Cash-In station)
  lastHpUpdate: string;        // ISO 8601 timestamp
  lastChallengeDate: string;   // YYYY-MM-DD
  isFat?: boolean;              // true when overfed; clears automatically on next HP decay
  petState: PetState;
  petName: string;
  petImageUrl?: string;         // original pet image, immutable
  activePetImageUrl?: string;   // current display image (with accessories), defaults to petImageUrl
  ownedAccessories: string[];   // array of accessory IDs the learner owns
  generatedComposites?: GeneratedComposite[]; // history of AI-generated composites for picking the best
  inventory: string[];
  unlockedBrochures: string[];
  lastFeedback?: {
    type: FeedbackType;
    timestamp: string;
  };
  lastHpAlertLevel?: number;
  petWish?: string;             // original wish text used to generate the pet
  fatPetImageUrl?: string;      // AI-generated chubby version, shown when isFat
  thinPetImageUrl?: string;     // AI-generated skinny version, shown when hp < 50
  starvingPetImageUrl?: string; // AI-generated skeletal version, shown when hp < 20
}

export interface Vocabulary {
  id: string;
  word: string;
  sentence: string;
  questionPrompt: string;
  level: number;
  imageUrl: string;
  type: 'basic' | 'cloze';
  srsLevel: number;
  lastReviewDate?: string | null;    // YYYY-MM-DD, null/undefined = never reviewed
  sessionInstanceId?: string | null; // which session this word came from
  createdDate?: string;              // YYYY-MM-DD, when this card was created (searchable)
}

export interface GrammarCard {
  id: string;
  rule: string;            // grammar rule name, e.g. "Present Perfect"
  target: string;          // target verb/form, e.g. "to go"
  wrongSentence: string;   // sentence with the error, e.g. "He has went to the store."
  correctSentence: string; // correct version, e.g. "He has gone to the store."
  errorWords: string[];    // which words are wrong (for highlight), e.g. ["went"]
  answer: string;          // correct replacement, e.g. "gone"
  srsLevel: number;
  lastReviewDate?: string | null;
  sessionInstanceId?: string | null;
  createdDate?: string;
}

export interface PhonicsCard {
  id: string;
  keyword: string;        // e.g. "ship"
  keywordIPA: string;     // e.g. "/ʃɪp/" — full IPA for keyword
  targetPhoneme: string;  // e.g. "ʃ" — the phoneme T selected
  pairWord: string;       // e.g. "chip" — minimal pair word
  targetIPA: string;      // e.g. "/ʃ/" — target phoneme IPA
  pairIPA: string;        // e.g. "/tʃ/" — contrasting phoneme IPA
  minimalPairs: Array<{ word1: string; word2: string }>;
  srsLevel: number;
  lastReviewDate?: string | null;
  sessionInstanceId?: string | null;
  createdDate?: string;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  type: 'accessory' | 'ticket';
  image: string;
  imageHint: string;
}

export interface PetShopItem {
  id: string;
  name: string;
  description: string;        // original prompt used to generate the accessory
  imageUrl: string;           // AI-generated accessory image
  price: number;              // price in Dorks (Copper equivalent, 1:1 with old XP values)
  stock: number;              // quantity available in shop
  collection: string;         // collection name (e.g., "Wizard Collection", "Space Collection")
  createdBy: string;          // teacher UID who created this
  createdDate: string;        // ISO 8601 timestamp
}

export interface Brochure {
  id: string;
  name: string;
  image: string;
  imageHint: string;
}

// ============================================
// DORK DENOMINATION HELPER
// ============================================

export function formatDorks(copperTotal: number): string {
  const gold = Math.floor(copperTotal / 100);
  const silver = Math.floor((copperTotal % 100) / 10);
  const copper = copperTotal % 10;

  const parts: string[] = [];
  if (gold > 0) parts.push(`${gold} Gold`);
  if (silver > 0) parts.push(`${silver} Silver`);
  if (copper > 0 || parts.length === 0) parts.push(`${copper} Copper`);
  return parts.join(', ');
}

export function getDorkDenominations(copperTotal: number): Dorks {
  return {
    gold: Math.floor(copperTotal / 100),
    silver: Math.floor((copperTotal % 100) / 10),
    copper: copperTotal % 10,
  };
}
