import { NextResponse } from 'next/server';
import { PROVIDERS } from '@/lib/ai/providers';

const TEST_MESSAGES = [
  { role: 'user' as const, content: 'Say "ok" and nothing else.' },
];

async function testProvider(name: string) {
  const config = PROVIDERS[name];
  if (!config) return { name, status: 'error', error: 'Unknown provider' };

  const apiKey = process.env[config.apiKeyEnvVar];
  if (!apiKey) return { name, status: 'missing_key', keyVar: config.apiKeyEnvVar };

  try {
    let response: Response;

    if (name === 'claude') {
      response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 16,
          messages: TEST_MESSAGES,
        }),
      });
    } else if (name === 'minimax') {
      response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'Say "ok" and nothing else.', name: 'test' }],
          max_tokens: 16,
        }),
      });
    } else {
      response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: TEST_MESSAGES,
          max_tokens: 16,
        }),
      });
    }

    const text = await response.text();
    if (!response.ok) {
      return { name, status: 'api_error', httpStatus: response.status, error: text };
    }
    return { name, status: 'ok', httpStatus: response.status };
  } catch (err: any) {
    return { name, status: 'exception', error: err.message };
  }
}

export async function GET() {
  const results = await Promise.all(
    Object.keys(PROVIDERS).map((name) => testProvider(name))
  );
  return NextResponse.json({ results });
}
