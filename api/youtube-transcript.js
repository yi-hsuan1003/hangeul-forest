export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = await getRawBody(req);
    const { url } = JSON.parse(body);
    if (!url) return res.status(400).json({ error: '需要 YouTube URL' });
    const videoId = url.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
    if (!videoId) return res.status(400).json({ error: '無效的 YouTube 連結' });
    const { YoutubeTranscript } = await import('youtube-transcript');
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ko' });
    const segments = transcript.map(t => ({
      start: t.offset / 1000,
      end: (t.offset + t.duration) / 1000,
      text: t.text
    }));
    const fullText = segments.map(s => s.text).join(' ');
    return res.status(200).json({ text: fullText, segments, videoId });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}
