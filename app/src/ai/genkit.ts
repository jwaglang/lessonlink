import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {genkitx} from '@genkit-ai/next';

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
