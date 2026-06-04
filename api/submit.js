export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const data = req.body;

    // Honeypot check
    if (data.company) return res.status(200).json({ ok: true });

    const { name_first, name_last, email, phone, school_text, chapter_text, instagram_handle, referred_by, message, source } = data;

    // Basic validation
    if (!name_first || !name_last || !email || !email.includes('@')) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Send to Formspree
    await fetch('https://formspree.io/f/mykayrnj', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: `${name_first} ${name_last}`,
        email,
        phone: phone || '',
        school: school_text || '',
        chapter: chapter_text || '',
        instagram: instagram_handle || '',
        referred_by: referred_by || '',
        message: message || '',
        source: source || 'website'
      })
    });

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Submit handler error:', err.message);
    return res.status(200).json({ ok: true });
  }
}
