'use server';

import { callAiProvider, type AiMessage } from '@/lib/ai/providers';

export interface WordIpaResult {
  fullIPA: string;     // e.g. "/ʃɪp/"
  phonemes: string[];  // e.g. ["ʃ", "ɪ", "p"]
}

/**
 * Returns the IPA transcription of a word and its individual phonemes.
 */
export async function getWordIPA(word: string): Promise<WordIpaResult> {
  const systemPrompt = `You are a phonetics expert. Given an English word, return its IPA transcription and its individual phonemes as a JSON array.
Return ONLY valid JSON. No explanation, no markdown, no code fences.`;

  const userPrompt = `Word: "${word}"

Return this exact JSON:
{
  "fullIPA": "/IPA transcription/",
  "phonemes": ["each", "phoneme", "separately"]
}`;

  const messages: AiMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await callAiProvider('word_ipa', messages);
  const text = response.content.trim();
  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    const parsed = JSON.parse(json) as WordIpaResult;
    if (!parsed.fullIPA || !Array.isArray(parsed.phonemes)) {
      throw new Error('Incomplete IPA response');
    }
    return parsed;
  } catch {
    throw new Error(`Failed to parse IPA response: ${text.slice(0, 200)}`);
  }
}
