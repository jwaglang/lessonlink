export interface MinimalPairsResult {
  targetIPA: string;
  pairIPA: string;
  pairs: Array<{ word1: string; word2: string }>;
}

export async function generateMinimalPairs(
  keyword: string,
  pairWord: string
): Promise<MinimalPairsResult> {
  const response = await fetch('/api/ai/generate-minimal-pairs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, pairWord }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate minimal pairs');
  }

  return response.json();
}
