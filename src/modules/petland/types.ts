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
  xp: number;
  hp: number;
  maxHp: number;
  dorks: Dorks;
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
  price: number;              // price in XP
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
