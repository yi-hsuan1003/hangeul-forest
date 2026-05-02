export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = await getRawBody(req);
    const { fileUrl, fileName } = JSON.parse(body);
    if (!fileUrl) return res.status(400).json({ error: '需要 fileUrl' });
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) throw new Error('無法下載檔案');
    const buffer = await fileRes.arrayBuffer();
    const ext = fileName?.split('.').pop() || 'mp3';
    const mimeMap = { mp3:'audio/mpeg', mp4:'video/mp4', m4a:'audio/mp4', wav:'audio/wav', webm:'audio/webm' };
    const mime = mimeMap[ext] || 'audio/mpeg';
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mime });
    formData.append('file', blob, fileName || 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', 'ko');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');
    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData
    });
    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      throw new Error('Whisper 錯誤：' + err);
    }
    const result = await whisperRes.json();
    return res.status(200).json({
      text: result.text,
      segments: result.segments || [],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}
