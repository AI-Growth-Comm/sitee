import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
const apiUrl = process.env.BUILT_IN_FORGE_API_URL || 'https://forge.manus.ai';

// Test the overview call directly
async function testOverview() {
  const system = `You are an expert SEO auditor. When given a website URL and industry, you analyze the site and return a structured JSON SEO health overview. You MUST return ONLY valid JSON with no markdown, no explanation, no code fences. Return the JSON object directly.`;

  const user = `Analyze this website for SEO health:
URL: https://example.com
Industry: SaaS

Return this exact JSON structure (fill in realistic values based on the URL and industry):
{
  "summary": "Two sentence summary of the site's SEO health.",
  "keyInsight": "One actionable key insight for improvement.",
  "overallScore": 68,
  "dimensions": [
    {"name": "Indexation", "score": 75, "note": "Brief note under 8 words"},
    {"name": "Metadata", "score": 60, "note": "Brief note under 8 words"},
    {"name": "Content Depth", "score": 70, "note": "Brief note under 8 words"},
    {"name": "Internal Links", "score": 55, "note": "Brief note under 8 words"},
    {"name": "Topical Authority", "score": 65, "note": "Brief note under 8 words"},
    {"name": "Local/Niche SEO", "score": 50, "note": "Brief note under 8 words"},
    {"name": "Technical SEO", "score": 72, "note": "Brief note under 8 words"},
    {"name": "Competitor Gap", "score": 45, "note": "Brief note under 8 words"}
  ]
}`;

  const payload = {
    model: "gemini-2.5-flash",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    max_tokens: 32768,
    thinking: { budget_tokens: 128 }
  };

  const response = await fetch(`${apiUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  console.log('Raw response (first 500 chars):', content.slice(0, 500));
  
  // Test extraction
  let text = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = text.indexOf('{');
  if (start !== -1) {
    let depth = 0, inStr = false, esc = false, end = -1;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\' && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') depth++;
      if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) {
      try {
        const parsed = JSON.parse(text.slice(start, end + 1));
        console.log('\n✅ JSON parsed successfully!');
        console.log('overallScore:', parsed.overallScore);
        console.log('dimensions count:', parsed.dimensions?.length);
        console.log('summary:', parsed.summary?.slice(0, 80));
      } catch(e) {
        console.error('❌ JSON parse failed:', e.message);
      }
    } else {
      console.error('❌ Could not find closing brace');
    }
  } else {
    console.error('❌ No JSON object found in response');
  }
}

testOverview().catch(console.error);
