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
    const supabaseUrl = process.env.SUPABASE_URL;
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

    // 2. Send notification email to team via Resend
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: 'Greek Empire <noreply@greekempire.com>',
          to: ['mike@empirepromos.com', 'brett@empirepromos.com'],
          subject: `New Ambassador Application — ${name_first} ${name_last} @ ${school_text || 'Unknown School'}`,
          html: `
            <h2>New Ambassador Application</h2>
            <table style="font-family:sans-serif; font-size:14px; border-collapse:collapse;">
              <tr><td style="padding:6px 12px; font-weight:bold;">Name</td><td style="padding:6px 12px;">${name_first} ${name_last}</td></tr>
              <tr><td style="padding:6px 12px; font-weight:bold;">Email</td><td style="padding:6px 12px;"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding:6px 12px; font-weight:bold;">School</td><td style="padding:6px 12px;">${school_text || '—'}</td></tr>
              <tr><td style="padding:6px 12px; font-weight:bold;">Chapter</td><td style="padding:6px 12px;">${chapter_text || '—'}</td></tr>
              <tr><td style="padding:6px 12px; font-weight:bold;">Instagram</td><td style="padding:6px 12px;">${instagram_handle || '—'}</td></tr>
              <tr><td style="padding:6px 12px; font-weight:bold;">Referred By</td><td style="padding:6px 12px;">${referred_by || recruited_by_text || '—'}</td></tr>
              <tr><td style="padding:6px 12px; font-weight:bold;">Message</td><td style="padding:6px 12px;">${message || '—'}</td></tr>
              <tr><td style="padding:6px 12px; font-weight:bold;">Source</td><td style="padding:6px 12px;">${source || '—'}</td></tr>
            </table>
          `
        })
      }).catch(e => errors.push(`Team email: ${e.message}`));

      // 3. Send confirmation email to applicant
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: 'Greek Empire <noreply@greekempire.com>',
          to: [email],
          subject: `We got your application, ${name_first}.`,
          html: `
            <div style="font-family:sans-serif; max-width:560px; margin:0 auto; color:#111;">
              <img src="https://greek-empire.vercel.app/greek-empire-wordmark.png" alt="Greek Empire" style="width:200px; margin-bottom:24px;" />
              <h2 style="font-size:22px; margin-bottom:8px;">Application Received</h2>
              <p style="color:#555; line-height:1.7;">Hey ${name_first} — we got your application and we'll be in touch within 24–48 hours.</p>
              <p style="color:#555; line-height:1.7;">In the meantime, follow us on Instagram <a href="https://instagram.com/_greekempire_" style="color:#C9A84C;">@_greekempire_</a> to stay up to date.</p>
              <p style="color:#C9A84C; font-size:13px; margin-top:32px; letter-spacing:0.05em;">GREEK EMPIRE — FOR THE BEST YEARS OF YOUR LIFE</p>
            </div>
          `
        })
      }).catch(e => errors.push(`Confirmation email: ${e.message}`));
    } else {
      errors.push('Resend API key missing');
      console.error('Missing RESEND_API_KEY');
    }

    if (errors.length) console.error('Submit errors:', errors);

    // Always return success to user — don't block on backend errors
    return res.status(200).json({ ok: true, errors: errors.length ? errors : undefined });

  } catch (err) {
    console.error('Submit handler error:', err.message);
    return res.status(200).json({ ok: true }); // still show success to user
  }
}
