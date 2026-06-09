export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL    = 'https://wwsjkiubkfcmpbjiqazj.supabase.co';
  const SERVICE_KEY     = process.env.SUPABASE_SERVICE_KEY;
  const BUCKET          = 'content-submissions';

  try {
    // Read raw body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const contentType = req.headers['content-type'] || 'image/jpeg';
    const mimeToExt = {
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
      'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/x-msvideo': 'avi',
      'video/webm': 'webm', 'video/x-m4v': 'm4v'
    };
    const ext = mimeToExt[contentType] || contentType.split('/')[1]?.split(';')[0] || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('Storage upload failed:', uploadRes.status, err);
      return res.status(502).json({ error: 'Upload failed', detail: err });
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
    return res.status(200).json({ url: publicUrl });

  } catch (err) {
    console.error('Upload handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
