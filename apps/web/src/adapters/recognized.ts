const recognizedHosts: Array<{ label: string; hosts: string[] }> = [
  { label: 'Vimeo', hosts: ['vimeo.com', 'player.vimeo.com'] },
  { label: 'Dailymotion', hosts: ['dailymotion.com', 'dai.ly'] },
  { label: 'Twitch', hosts: ['twitch.tv'] },
  { label: 'Wistia', hosts: ['wistia.com', 'wi.st'] },
  { label: 'Loom', hosts: ['loom.com'] },
  { label: 'Internet Archive', hosts: ['archive.org'] },
  { label: 'PeerTube', hosts: [] },
  { label: 'Netflix', hosts: ['netflix.com'] },
  { label: 'Prime Video', hosts: ['primevideo.com'] },
  { label: 'Disney+', hosts: ['disneyplus.com'] },
  { label: 'Hulu', hosts: ['hulu.com'] },
  { label: 'Max', hosts: ['max.com'] },
  { label: 'Apple TV+', hosts: ['tv.apple.com'] }
]

export function getRecognizedPlatform(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    return recognizedHosts.find(({ hosts }) => hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`)))?.label || null
  } catch {
    return null
  }
}
