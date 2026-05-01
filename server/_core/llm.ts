const MODELS = [
  "google/gemini-2.0-flash-001",
  "openai/gpt-4o-mini",
  "anthropic/claude-3-haiku",
];

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function callOpenRouter(model: string, messages: { role: string; content: string }[]): Promise<any> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://sitee-audit.netlify.app",
      "X-Title": "Sitee SEO Audit",
    },
    body: JSON.stringify({ model, messages, max_tokens: 8192 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${model} failed: ${res.status} ${err}`);
  }
  return res.json();
}

export async function invokeLLM(params: { messages: { role: string; content: string }[] }): Promise<any> {
  let lastError: Error | null = null;
  for (const model of MODELS) {
    try {
      console.log(`[LLM] Trying model: ${model}`);
      const result = await callOpenRouter(model, params.messages);
      console.log(`[LLM] Success with: ${model}`);
      return result;
    } catch (err) {
      console.warn(`[LLM] Model ${model} failed:`, err);
      lastError = err as Error;
    }
  }
  throw lastError ?? new Error("All LLM models failed");
}
