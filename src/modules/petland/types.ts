export type PetState = 'egg' | 'hatched';

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
  isSick: boolean;
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
