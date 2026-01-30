/*
================================================================================
PHASE 5: AI INTEGRATION - CURRENTLY DISABLED
================================================================================
This file configures Genkit AI for:
- AI-powered lesson feedback generation (Claude API)
- Assessment report generation
- Progress recommendations

TO RE-ENABLE (Phase 5):
1. Install dependencies: npm install genkit @genkit-ai/google-genai
2. Add GEMINI_API_KEY to .env.local
3. Uncomment this entire file
4. Uncomment imports in files that use 'ai' export

ORIGINAL CODE BELOW:
--------------------------------------------------------------------------------

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {genkitx} from 'genkit/next';

const plugins = [genkitx()];

if (process.env.GEMINI_API_KEY) {
  plugins.push(googleAI());
} else {
  console.warn(`
    ********************************************************************************
    * GENKIT-AI WARNING
    * -----------------
    * The GEMINI_API_KEY environment variable is not set.
    *
    * The AI-powered features of this application will not work.
    * To enable them, please add your Gemini API key to the .env file.
    *
    * You can obtain a key from Google AI Studio:
    * https://aistudio.google.com/app/apikey
    ********************************************************************************
  `);
}

export const ai = genkit({
  plugins,
  model: 'googleai/gemini-2.5-flash',
});

================================================================================
*/

// Placeholder export to prevent import errors
export const ai = null;