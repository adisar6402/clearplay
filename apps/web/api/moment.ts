interface VercelRequest {
  url?: string
  headers: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  setHeader(name: string, value: string): void
  status(code: number): VercelResponse
  send(body: string): void
}

interface OEmbedResponse {
  title?: string
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const requestUrl = new URL(request.url || '/moment', 'https://clearplay.vercel.app')
  const videoId = requestUrl.searchParams.get('v') || ''
  const timestamp = parseTimestamp(requestUrl.searchParams.get('t'))

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    response.status(400).send('Invalid Moment URL')
    return
  }

  let title = 'YouTube video'
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
    const oembedResponse = await fetch(oembedUrl)
    if (oembedResponse.ok) {
      const data = await oembedResponse.json() as OEmbedResponse
      title = data.title?.trim() || title
    }
  } catch {
    // The thumbnail and a useful fallback title remain available if oEmbed is unavailable.
  }

  const hostHeader = request.headers['x-forwarded-host'] || request.headers.host
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader
  const protocolHeader = request.headers['x-forwarded-proto']
  const protocol = Array.isArray(protocolHeader) ? protocolHeader[0] : protocolHeader
  const origin = `${protocol || 'https'}://${host || 'clearplay.vercel.app'}`
  const canonicalUrl = `${origin}/moment?v=${encodeURIComponent(videoId)}&t=${timestamp}`
  const description = `ClearPlay Moment · ${formatTime(timestamp)} — Watch this moment on ClearPlay.`
  const imageUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  response.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta property="og:type" content="video.other">
    <meta property="og:site_name" content="ClearPlay">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  </head>
  <body><p><a href="${escapeHtml(canonicalUrl)}">Open this Moment in ClearPlay</a></p></body>
</html>`)
}

function parseTimestamp(value: string | null) {
  const timestamp = Number(value || 0)
  return Number.isFinite(timestamp) && timestamp >= 0 && timestamp <= 86400
    ? Math.floor(timestamp)
    : 0
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remaining = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remaining}`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character] || character)
}
