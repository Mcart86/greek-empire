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

    const { name_first, name_last, email } = data;

    // Basic validation
    if (!name_first || !name_last || !email || !email.includes('@')) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // CRM integration goes here
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Submit handler error:', err.message);
    return res.status(200).json({ ok: true });
  }
}
