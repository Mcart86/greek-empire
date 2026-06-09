import sharp from 'sharp';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = 'https://wwsjkiubkfcmpbjiqazj.supabase.co';
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
  const BUCKET       = 'content-submissions';

  try {
    // Read raw body — collect all chunks into a single buffer
    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on('end', resolve);
      req.on('error', reject);
    });
    let buffer = Buffer.concat(chunks);

    console.log('Received buffer size:', buffer.length, 'bytes');

    const contentType = req.headers['content-type'] || 'image/jpeg';
    const isVideo = contentType.startsWith('video/');

    let finalBuffer  = buffer;
    let finalMime    = contentType;
    let finalExt     = 'jpg';

    if (isVideo) {
      // Pass video through unchanged
      const mimeToExt = {
        'video/mp4': 'mp4', 'video/quicktime': 'mov',
        'video/x-msvideo': 'avi', 'video/webm': 'webm', 'video/x-m4v': 'm4v'
      };
      finalExt  = mimeToExt[contentType] || 'mov';
      finalMime = contentType;
      console.log('Video upload, ext:', finalExt, 'size:', buffer.length);
    } else {
      // Convert all images (especially HEIC) to JPEG via sharp
      try {
        console.log('Converting image with sharp, input size:', buffer.length);
        finalBuffer = await sharp(buffer, { failOnError: false })
          .rotate()
          .jpeg({ quality: 88 })
          .toBuffer();
        finalMime   = 'image/jpeg';
        finalExt    = 'jpg';
        console.log('Sharp output size:', finalBuffer.length);
      } catch (convertErr) {
        console.error('Sharp conversion failed:', convertErr.message);
        // Upload raw as fallback
        finalBuffer = buffer;
        finalMime   = contentType;
        finalExt    = contentType.split('/')[1] || 'jpg';
      }
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${finalExt}`;

    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
          'Content-Type': finalMime,
          'x-upsert': 'true',
        },
        body: finalBuffer,
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
