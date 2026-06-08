export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try {
    body = req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const forwarded = {
    name_first:        body.name_first,
    name_last:         body.name_last,
    email:             body.email,
    phone:             body.phone,
    school_text:       body.school_text,
    chapter_text:      body.chapter_text,
    instagram_handle:  body.instagram_handle,
    recruited_by_text: body.referred_by,
    company:           body.company,
    source:            body.source || 'website',
  };

  const crmRes = await fetch(
    'https://gxglrktbvumrpzhlogno.supabase.co/functions/v1/apply',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forwarded),
    }
  );

  if (!crmRes.ok) {
    const detail = await crmRes.text().catch(() => '');
    console.error('CRM intake failed:', crmRes.status, detail);
    return res.status(502).json({ error: 'Could not submit application' });
  }

  return res.status(200).json({ ok: true });
}
