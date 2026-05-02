export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = await getRawBody(req);
    const { text } = JSON.parse(body);
    if (!text) return res.status(400).json({ error: '需要 text' });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1000,
        messages: [{
          role: 'system',
          content: `你是韓文學習助手。分析韓文文字，回傳 JSON 格式（不要加 markdown）：
{
  "translation": "中文翻譯",
  "words": [
    {"word": "韓文單字", "pos": "詞性(名詞/動詞/形容詞)", "definition": "中文意思", "romanization": "羅馬拼音"}
  ]
}
只標記名詞、動詞、形容詞，不標記助詞、連接詞。每個單字只出現一次。`
        }, {
          role: 'user',
          content: text
        }]
      })
    });

    if (!response.ok) throw new Error('GPT API 錯誤');
    const data = await response.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content.replace(/```json|```/g, '').trim());
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}
