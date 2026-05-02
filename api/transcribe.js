export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const boundary = req.headers['content-type'].split('boundary=')[1];
    const parts = buffer.toString('binary').split('--' + boundary);
    
    let fileBuffer, fileName, mimeType;
    for (const part of parts) {
      if (part.includes('Content-Disposition') && part.includes('filename')) {
        const nameMatch = part.match(/filename="([^"]+)"/);
        const typeMatch = part.match(/Content-Type: ([^\r\n]+)/);
        if (nameMatch) fileName = nameMatch[1];
        if (typeMatch) mimeType = typeMatch[1].trim();
        const bodyStart = part.indexOf('\r\n\r\n') + 4;
        const bodyEnd = part.lastIndexOf('\r\n');
        fileBuffer = Buffer.from(part.slice(bodyStart, bodyEnd), 'binary');
      }
    }

    if (!fileBuffer) return res.status(400).json({ error: '找不到檔案' });

    const { FormData, File } = await import('node-fetch').then(() => globalThis);
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType || 'audio/mpeg' });
    formData.append('file', blob, fileName || 'audio.mp3');
    formData.append('model', 'whisper-1');
    formData.append('language', 'ko');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      return res.status(500).json({ error: 'Whisper API 錯誤', detail: err });
    }

    const result = await whisperRes.json();
    return res.status(200).json({ 
      text: result.text,
      segments: result.segments || [],
      words: result.words || []
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
