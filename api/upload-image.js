import heicConvert from 'heic-convert';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SUPABASE_URL = 'https://wwsjkiubkfcmpbjiqazj.supabase.co';
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
  const BUCKET       = 'content-submissions';

  try {
    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on('end', resolve);
      req.on('error', reject);
    });
    const buffer = Buffer.concat(chunks);

    const contentType = req.headers['content-type'] || '';
    console.log('upload-image: content-type=' + contentType + ' size=' + buffer.length);

    const isVideo = contentType.startsWith('video/');
    // iOS sends HEIC as image/heic, image/heif, or sometimes blank/octet-stream
    const isHeic  = ['image/heic','image/heif','application/octet-stream',''].includes(contentType)
                    && !isVideo;

    let finalBuffer = buffer;
    let finalMime   = 'image/jpeg';
    let finalExt    = 'jpg';

    if (isVideo) {
      const mimeToExt = {
        'video/mp4': 'mp4', 'video/quicktime': 'mov',
        'video/x-msvideo': 'avi', 'video/webm': 'webm', 'video/x-m4v': 'm4v'
      };
      finalExt  = mimeToExt[contentType] || 'mov';
      finalMime = contentType;
      finalBuffer = buffer;
      console.log('upload-image: video passthrough ext=' + finalExt);
    } else if (isHeic) {
      try {
        console.log('upload-image: converting HEIC size=' + buffer.length);
        const result = await heicConvert({
          buffer: new Uint8Array(buffer),
          format: 'JPEG',
          quality: 0.88
        });
        finalBuffer = Buffer.from(result);
        finalMime   = 'image/jpeg';
        finalExt    = 'jpg';
        console.log('upload-image: heic-convert success size=' + finalBuffer.length);
      } catch (e) {
        console.error('upload-image: heic-convert error=' + e.message);
        finalBuffer = buffer;
        finalMime   = 'image/jpeg';
        finalExt    = 'jpg';
      }
    } else {
      // PNG, JPEG, WEBP — upload as-is
      const mimeToExt = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
      finalExt    = mimeToExt[contentType] || 'jpg';
      finalMime   = contentType || 'image/jpeg';
      finalBuffer = buffer;
      console.log('upload-image: passthrough image ext=' + finalExt);
    }

    const fileName  = Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + finalExt;
    const uploadRes = await fetch(
      SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + fileName,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + SERVICE_KEY,
          'apikey': SERVICE_KEY,
          'Content-Type': finalMime,
          'x-upsert': 'true',
        },
        body: finalBuffer,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('upload-image: storage error=' + uploadRes.status + ' ' + err);
      return res.status(502).json({ error: 'Upload failed', detail: err });
    }

    const publicUrl = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + fileName;
    console.log('upload-image: success url=' + publicUrl);
    return res.status(200).json({ url: publicUrl });

  } catch (err) {
    console.error('upload-image: fatal=' + err.message);
    return res.status(500).json({ error: err.message });
  }
}
