export type PetState = 'egg' | 'hatched' | 'dead';

export type FeedbackType = 'wow' | 'brainfart' | 'treasure';

export interface Dorks {
  gold: number;
  silver: number;
  copper: number;
}

export interface PetlandProfile {
  xp: number;
  hp: number;
  maxHp: number;
  dorks: Dorks;
  lastHpUpdate: string;        // ISO 8601 timestamp
  lastChallengeDate: string;   // YYYY-MM-DD
  isFat?: boolean;              // true when overfed; clears automatically on next HP decay
  petState: PetState;
  petName: string;
  petImageUrl?: string;
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
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  type: 'accessory' | 'ticket';
  image: string;
  imageHint: string;
}

export interface Brochure {
  id: string;
  name: string;
  image: string;
  imageHint: string;
}
