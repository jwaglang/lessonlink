export async function generateSentence(word: string, level: number): Promise<string> {
  const response = await fetch('/api/ai/generate-sentence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, level }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate sentence');
  }

  const data = await response.json();
  return data.sentence;
}
