export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = await getRawBody(req);
    const { words, userId } = JSON.parse(body);
    if (!words?.length || !userId) return res.status(400).json({ error: '缺少資料' });

    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const rows = words.map(w => ({
      user_id: userId,
      word: w.word,
      definition: w.definition || '',
      romanization: w.romanization || '',
      pos: w.pos || '',
      source: w.source || 'TOPIK 單字表',
      srs_interval: 1,
      srs_repetition: 0,
      srs_ef: 2.5,
      next_review_at: new Date().toISOString()
    }));

    const { error } = await supa
      .from('vocabulary')
      .upsert(rows, { onConflict: 'user_id,word', ignoreDuplicates: true });

    if (error) throw new Error(error.message);
    return res.status(200).json({ imported: rows.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
}
