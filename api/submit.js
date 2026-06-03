export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = req.body;

    // Honeypot check
    if (data.company) return res.status(200).json({ ok: true }); // silently reject bots

    const {
      name_first, name_last, email, school_text, chapter_text,
      instagram_handle, referred_by, recruited_by_text, message, source
    } = data;

    // Basic validation
    if (!name_first || !name_last || !email || !email.includes('@')) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const errors = [];

    // 1. Send to Supabase with anon key
    const supabaseUrl = process.env.SUPABASE_URL || 'https://uuyyaymtogcvnhuobkyj.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supaRes = await fetch(`${supabaseUrl}/rest/v1/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          name_first, name_last, email, school_text, chapter_text,
          instagram_handle,
          referred_by: referred_by || recruited_by_text || null,
          message: message || null,
          source: source || 'website',
          submitted_at: new Date().toISOString()
        })
      });
      if (!supaRes.ok) {
        const err = await supaRes.text();
        errors.push(`Supabase: ${err}`);
        console.error('Supabase error:', err);
      }
    } else {
      errors.push('Supabase env vars missing');
      console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }



    if (errors.length) console.error('Submit errors:', errors);

    // Always return success to user — don't block on backend errors
    return res.status(200).json({ ok: true, errors: errors.length ? errors : undefined });

  } catch (err) {
    console.error('Submit handler error:', err.message);
    return res.status(200).json({ ok: true }); // still show success to user
  }
}
