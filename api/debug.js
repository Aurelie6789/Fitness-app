export default function handler(req, res) {
  res.json({
    hasKey: !!process.env.ANTHROPIC_API_KEY,
    keyLength: (process.env.ANTHROPIC_API_KEY || '').length,
    nodeEnv: process.env.NODE_ENV,
  })
}
