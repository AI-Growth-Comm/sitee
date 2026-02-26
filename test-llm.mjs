import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
const apiUrl = process.env.BUILT_IN_FORGE_API_URL || 'https://forge.manus.im';

console.log('API Key present:', !!apiKey);
console.log('API URL:', apiUrl);

const payload = {
  model: "gemini-2.5-flash",
  messages: [
    { role: "user", content: 'Return this exact JSON: {"test":true,"score":72}' }
  ],
  max_tokens: 200,
  thinking: { budget_tokens: 128 }
};

try {
  const response = await fetch(`${apiUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
  
  console.log('Status:', response.status, response.statusText);
  const data = await response.json();
  console.log('Response:', JSON.stringify(data).slice(0, 500));
} catch(e) {
  console.error('Error:', e.message);
}
