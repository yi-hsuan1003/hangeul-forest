export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = await getRawBody(req);
    const { fileUrl } = JSON.parse(body);
    if (!fileUrl) return res.status(400).json({ error: '需要 fileUrl' });
    const fileRes = await fetch(fileUrl);
    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
    const data = await pdfParse(buffer);
    return res.status(200).json({ text: data.text, pages: data.numpages });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}
