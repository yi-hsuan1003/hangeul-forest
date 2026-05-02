export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { fileUrl } = req.body ? JSON.parse(await getRawBody(req)) : {};
    if (!fileUrl) return res.status(400).json({ error: '需要 fileUrl' });
    const pdfRes = await fetch(fileUrl);
    const buffer = await pdfRes.arrayBuffer();
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.js');
    const pdf = await getDocument({ data: buffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n\n';
    }
    return res.status(200).json({ text, pages: pdf.numPages });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}
