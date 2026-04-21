export interface ClozeResult {
  cloze: string;
  answer: string;
}

export async function generateCloze(
  role: string,
  tSentence: string,
  cefrLevel: string = 'B1'
): Promise<ClozeResult> {
  const response = await fetch('/api/ai/generate-cloze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, tSentence, cefrLevel }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to generate cloze');
  }

  return response.json();
}
