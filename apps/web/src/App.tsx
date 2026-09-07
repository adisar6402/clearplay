import { useEffect, useRef, useState } from 'react'
import type { VideoMetadata } from '@clearplay/core'
import { adapterRegistry } from './adapters/registry'
import { Layout } from './components/layout/Layout'
import { Home } from './features/home/Home'
import { VideoPlayer } from './features/player/VideoPlayer'
import { History } from './features/history/History'
import { WatchLater } from './features/watch-later/WatchLater'
import { Preferences } from './features/preferences/Preferences'
import { MomentShare } from './features/moments/MomentShare'
import { continueWatchingRepository, defaultPreferences, historyRepository, preferencesRepository, watchLaterRepository } from './storage/repository'
import type { UserPreferences } from './storage/db'
import './App.css'

const normalizeVideoUrl = (url: string | null) => url ? adapterRegistry.normalizeUrl(url) : null

const getInitialVideo = () => {
  const params = new URLSearchParams(window.location.search)
  const legacyVideo = params.get('video')
  const rawVideo = legacyVideo || (window.location.pathname === '/watch' || window.location.pathname === '/moment' ? params.get('v') : null)
  const normalizedUrl = normalizeVideoUrl(rawVideo)
  const videoId = normalizedUrl ? adapterRegistry.getVideoId(normalizedUrl) : null
  if (!legacyVideo && rawVideo && videoId && rawVideo !== videoId && (window.location.pathname === '/watch' || window.location.pathname === '/moment')) {
    const canonicalLocation = new URL(window.location.href)
    canonicalLocation.searchParams.set('v', videoId)
    window.history.replaceState({}, '', canonicalLocation)
  }
  return normalizedUrl
}
const getInitialPosition = () => {
  const value = Number(new URLSearchParams(window.location.search).get('t') || 0)
  return Number.isFinite(value) && value >= 0 && value <= 86400 ? value : 0
}

function App() {
  const [path, setPath] = useState(() => window.location.pathname)
  const [currentUrl, setCurrentUrl] = useState<string | null>(() => getInitialVideo())
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null)
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [importError, setImportError] = useState<string | null>(null)
  const [unsupportedUrl, setUnsupportedUrl] = useState<string | null>(null)
  const [unsupportedPlatform, setUnsupportedPlatform] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [shareMessage, setShareMessage] = useState<string | null>(null)
  const [momentPosition, setMomentPosition] = useState<number | null>(null)
  const [playbackDuration, setPlaybackDuration] = useState(0)
  const recordedHistory = useRef(false)
  const lastPersistedPosition = useRef(0)
  const completionHandled = useRef(false)
  const latestPlaybackPosition = useRef(0)

  useEffect(() => {
    void preferencesRepository.getAll().then(setPreferences).catch(() => setPreferences(defaultPreferences))
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname)
      setCurrentUrl(getInitialVideo())
      setMetadata(null)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (nextPath: string) => {
    const normalizedPath = ['/history', '/watch-later', '/preferences'].includes(nextPath) ? nextPath : '/'
    window.history.pushState({}, '', normalizedPath)
    setPath(normalizedPath)
    setCurrentUrl(null)
    setMetadata(null)
    setImportError(null)
    setUnsupportedUrl(null)
    setUnsupportedPlatform(null)
    setMomentPosition(null)
  }

  const openVideo = (url: string, position?: number) => {
    const normalizedUrl = normalizeVideoUrl(url)
    if (!normalizedUrl) return
    const videoId = adapterRegistry.getVideoId(normalizedUrl)
    if (!videoId) return
    const nextUrl = new URL(window.location.href)
    nextUrl.pathname = '/watch'
    nextUrl.searchParams.set('v', videoId)
    nextUrl.searchParams.delete('video')
    if (position !== undefined && Number.isFinite(position) && position >= 0) nextUrl.searchParams.set('t', String(Math.floor(position)))
    else nextUrl.searchParams.delete('t')
    window.history.pushState({}, '', nextUrl)
    setPath('/')
    setCurrentUrl(normalizedUrl)
    setMetadata(null)
    setImportError(null)
    setMomentPosition(null)
  }

  const handleImport = (url: string) => {
    if (!adapterRegistry.getAdapter(url)) {
      const recognizedPlatform = adapterRegistry.getRecognizedPlatform(url)
      setUnsupportedUrl(recognizedPlatform ? url : null)
      setUnsupportedPlatform(recognizedPlatform)
      setImportError(recognizedPlatform
        ? `${recognizedPlatform} is recognized, but ClearPlay cannot play it inside the PWA yet. Open it on ${recognizedPlatform} to watch.`
        : 'That link is invalid or unsupported. Paste a public YouTube watch, Shorts, or youtu.be URL.')
      return
    }
    setUnsupportedUrl(null)
    setUnsupportedPlatform(null)
    openVideo(url)
  }

  const handleMetadata = async (meta: VideoMetadata) => {
    setMetadata(meta)
    setPlaybackDuration(meta.duration || 0)
    recordedHistory.current = false
    lastPersistedPosition.current = 0
    completionHandled.current = false
    latestPlaybackPosition.current = getInitialPosition()
    setIsSaved(await watchLaterRepository.exists(meta.url).catch(() => false))
    setSaveMessage(null)
    setShareMessage(null)
  }

  const handleProgress = async (position: number) => {
    latestPlaybackPosition.current = position
    if (!currentUrl || !metadata) return
    const duration = metadata.duration || playbackDuration
    if (!recordedHistory.current && (position >= 10 || (duration > 0 && position / duration >= 0.05))) {
      recordedHistory.current = true
      await historyRepository.add({
        url: metadata.url, videoId: metadata.id, platform: metadata.platform,
        title: metadata.title, thumbnail: metadata.thumbnail, duration, position, timestamp: Date.now()
      }).catch(() => { recordedHistory.current = false })
    }
    const shouldPersist = position >= 10 && position - lastPersistedPosition.current >= 5
    if (shouldPersist && (!duration || position < duration - 10)) {
      lastPersistedPosition.current = position
      const entry = {
        url: currentUrl, videoId: metadata.id, platform: metadata.platform,
        title: metadata.title, thumbnail: metadata.thumbnail, position, duration, updatedAt: Date.now()
      }
      await Promise.all([
        continueWatchingRepository.update(entry),
        historyRepository.add({ ...entry, timestamp: Date.now() })
      ]).catch(() => undefined)
    } else if (duration > 0 && position >= duration - 10 && !completionHandled.current) {
      completionHandled.current = true
      await continueWatchingRepository.remove(currentUrl)
    }
  }

  const saveForLater = async () => {
    if (!metadata || isSaved) return
    try {
      await watchLaterRepository.add({
        url: metadata.url, videoId: metadata.id, platform: metadata.platform,
        title: metadata.title, thumbnail: metadata.thumbnail, addedAt: Date.now()
      })
      setIsSaved(true)
      setSaveMessage('Saved for later')
    } catch {
      setSaveMessage('This video could not be saved on this device.')
    }
  }

  const shareViewing = async () => {
    if (!currentUrl) return
    const shareUrl = new URL(window.location.href)
    shareUrl.pathname = '/watch'
    const videoId = adapterRegistry.getVideoId(currentUrl)
    if (!videoId) return
    shareUrl.searchParams.set('v', videoId)
    shareUrl.searchParams.delete('video')
    const shareData = { title: metadata?.title || 'Watch with ClearPlay', text: 'Watch this in ClearPlay', url: shareUrl.toString() }
    try {
      if (navigator.share) await navigator.share(shareData)
      else {
        await copyToClipboard(shareUrl.toString())
        setShareMessage('Viewing link copied')
      }
    } catch {
      setShareMessage('Sharing was cancelled or unavailable')
    }
  }

  const openMomentShare = (position: number) => {
    if (!metadata || !currentUrl || !Number.isFinite(position) || position < 0 || position > 86400) return
    setMomentPosition(Math.floor(position))
  }

  const momentUrl = momentPosition === null || !metadata ? null : (() => {
    const url = new URL(window.location.origin)
    url.pathname = '/moment'
    url.searchParams.set('v', metadata.id)
    url.searchParams.set('t', String(momentPosition))
    return url.toString()
  })()

  const updatePreference = async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    await preferencesRepository.set(key, value)
  }

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
  }, [preferences.theme])

  const initialPosition = currentUrl ? getInitialPosition() : 0
  const isFocusMode = preferences.focusMode && Boolean(currentUrl)

  return (
    <Layout onNavigate={navigate} focusMode={isFocusMode}>
      <div className={`app-content ${isFocusMode ? 'focus-mode' : ''}`}>
        {currentUrl ? (
          <div className="container player-view">
            <div className="player-header">
              <button className="text-button" onClick={() => navigate('/')} aria-label="Back to home">← Back</button>
              <button className="text-button" onClick={() => void updatePreference('focusMode', !preferences.focusMode)} aria-pressed={preferences.focusMode}>
                {preferences.focusMode ? 'Exit Focus Mode' : 'Focus Mode'}
              </button>
            </div>
            <VideoPlayer url={currentUrl} initialPosition={initialPosition} autoplay={preferences.autoplay} onMetadata={handleMetadata} onProgress={handleProgress} onDuration={setPlaybackDuration} onPositionChange={(position) => { latestPlaybackPosition.current = position }} onShareMoment={openMomentShare} />
            {!isFocusMode && metadata && (
              <section className="video-info" aria-live="polite">
                <div className="video-heading">
                  <div>
                    <p className="eyebrow">{metadata.platform} · focused viewing</p>
                    <h1 className="video-title">{metadata.title}</h1>
                    {metadata.author && <p className="muted">{metadata.author}</p>}
                  </div>
                  <div className="video-actions">
                    <button className={`action-button primary-action ${isSaved ? 'is-saved' : ''}`} onClick={() => void saveForLater()} disabled={isSaved}>{isSaved ? 'Saved ✓' : 'Save for later'}</button>
                    <button className="action-button" onClick={() => openMomentShare(latestPlaybackPosition.current)}>Share Moment ↗</button>
                    <button className="action-button" onClick={() => void shareViewing()}>Share</button>
                  </div>
                </div>
                {(saveMessage || shareMessage) && <p className="inline-feedback" role="status">{saveMessage || shareMessage}</p>}
                <div className="availability-note">Smart Skip and chapters appear here when legitimate platform metadata is available.</div>
              </section>
            )}
          </div>
        ) : path === '/history' ? (
          <History onOpen={openVideo} />
        ) : path === '/watch-later' ? (
          <WatchLater onOpen={openVideo} />
        ) : path === '/preferences' ? (
          <Preferences preferences={preferences} onChange={updatePreference} />
        ) : (
          <Home onImport={handleImport} importError={importError} unsupportedUrl={unsupportedUrl} unsupportedPlatform={unsupportedPlatform} onOpen={openVideo} />
        )}
      </div>
      {momentPosition !== null && metadata && momentUrl && <MomentShare metadata={metadata} position={momentPosition} url={momentUrl} onClose={() => setMomentPosition(null)} />}
    </Layout>
  )
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Clipboard unavailable')
}

export default App
