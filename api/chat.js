export default async function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS')
  res.setHeader('access-control-allow-headers', 'content-type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).send('Missing API key')

  // Collect request body
  const body = await new Promise((resolve) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => resolve(data))
  })

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body,
  })

  res.status(upstream.status)
  res.setHeader('content-type', upstream.headers.get('content-type') ?? 'text/event-stream')

  const reader = upstream.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) { res.end(); break }
    res.write(value)
  }
}
