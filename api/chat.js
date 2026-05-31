export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, max_tokens, system, messages } = req.body;
    
    console.log('Chat API called:', { model, system_len: system?.length, messages_len: messages?.length });

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || 'missing-key',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-6',
        max_tokens: max_tokens || 1000,
        system: system || '',
        messages: messages || [],
      }),
    });

    const data = await anthropicRes.json();
    
    console.log('Anthropic response status:', anthropicRes.status);
    console.log('Anthropic response:', JSON.stringify(data).slice(0, 200));
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(anthropicRes.status).json(data);

  } catch (err) {
    console.error('Chat API error:', err.message);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
