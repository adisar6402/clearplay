import { useEffect, useEffectEvent, useRef, useState, type KeyboardEvent } from 'react'
import type { PlayerInstance, VideoMetadata } from '@clearplay/core'
import { adapterRegistry } from '../../adapters/registry'
import './VideoPlayer.css'

interface VideoPlayerProps {
  url: string
  initialPosition?: number
  autoplay?: boolean
  onProgress?: (position: number) => void
  onMetadata?: (metadata: VideoMetadata) => void
  onDuration?: (duration: number) => void
  onShareMoment?: (position: number) => void
  onPositionChange?: (position: number) => void
}

type FullscreenShell = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}

export function VideoPlayer({ url, initialPosition = 0, autoplay = false, onProgress, onMetadata, onDuration, onShareMoment, onPositionChange }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onProgressRef = useRef(onProgress)
  const onMetadataRef = useRef(onMetadata)
  const onDurationRef = useRef(onDuration)
  const onPositionChangeRef = useRef(onPositionChange)
  const getInitializationOptions = useEffectEvent(() => ({ autoplay, initialPosition }))
  const playerRef = useRef<PlayerInstance | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [ready, setReady] = useState(false)

  useEffect(() => { onProgressRef.current = onProgress; onMetadataRef.current = onMetadata; onDurationRef.current = onDuration; onPositionChangeRef.current = onPositionChange }, [onProgress, onMetadata, onDuration, onPositionChange])

  useEffect(() => {
    let active = true
    let currentInstance: PlayerInstance | null = null
    const container = containerRef.current
    if (!container) return
    const { autoplay: autoplayForLoad, initialPosition: initialPositionForLoad } = getInitializationOptions()
    queueMicrotask(() => {
      if (!active) return
      setLoading(true)
      setError(null)
      setPlaying(false)
      setReady(false)
      setPosition(initialPositionForLoad)
    })

    const load = async () => {
      try {
        const adapter = adapterRegistry.getAdapter(url)
        if (!adapter) throw new Error('This video platform is not supported yet.')
        const metadata = await adapter.getMetadata(url)
        if (!active) return
        onMetadataRef.current?.(metadata)
        const instance = await adapter.loadPlayer(container, url, (nextPosition) => {
          if (!active || containerRef.current !== container) return
          setPosition(nextPosition)
          setPlaying(true)
          onProgressRef.current?.(nextPosition)
        })
        if (!active) { instance.destroy(); return }
        currentInstance = instance
        playerRef.current = instance
        setReady(true)
        setMuted(instance.isMuted?.() ?? false)
        const nextDuration = instance.getDuration()
        setDuration(nextDuration)
        onDurationRef.current?.(nextDuration)
        if (initialPositionForLoad > 0) instance.seek(initialPositionForLoad)
        if (autoplayForLoad) instance.play()
      } catch (reason) {
        const cancelled = reason instanceof Error && reason.name === 'AbortError'
        if (active && !cancelled) setError(reason instanceof Error ? reason.message : 'The video could not be loaded.')
      } finally {
        if (active) { setLoading(false); setPlaying(autoplayForLoad) }
      }
    }
    void load()
    return () => {
      active = false
      adapterRegistry.getAdapter(url)?.cancelPlayerLoad?.(container)
      if (currentInstance) {
        const finalPosition = currentInstance.getPlaybackPosition()
        if (Number.isFinite(finalPosition) && finalPosition >= 0) onProgressRef.current?.(finalPosition)
      }
      playerRef.current = null
      currentInstance?.destroy()
    }
  }, [url])

  const togglePlayback = () => {
    const player = playerRef.current
    if (!player) return
    if (playing) { player.pause(); setPlaying(false) } else { player.play(); setPlaying(true) }
  }

  const toggleMute = () => {
    const player = playerRef.current
    if (!player) return
    if (muted) {
      if (player.unmute) player.unmute()
      else player.setVolume(100)
    } else {
      if (player.mute) player.mute()
      else player.setVolume(0)
    }
    window.setTimeout(() => setMuted(player.isMuted?.() ?? !muted), 0)
  }

  const changeSpeed = (nextSpeed: number) => {
    playerRef.current?.setPlaybackRate?.(nextSpeed)
    setSpeed(nextSpeed)
  }

  const seekBy = (seconds: number) => {
    const nextPosition = Math.max(0, Math.min(duration || Number.MAX_SAFE_INTEGER, position + seconds))
    playerRef.current?.seek(nextPosition)
    setPosition(nextPosition)
    onPositionChangeRef.current?.(nextPosition)
  }

  const toggleFullscreen = () => {
    const element = containerRef.current?.parentElement as FullscreenShell | null
    if (!element) return

    const fullscreenDocument = document as FullscreenDocument
    const activeElement = document.fullscreenElement || fullscreenDocument.webkitFullscreenElement
    if (activeElement) {
      const exitFullscreen = document.exitFullscreen || fullscreenDocument.webkitExitFullscreen
      if (exitFullscreen) void Promise.resolve(exitFullscreen.call(document)).catch(() => undefined)
      return
    }

    const requestFullscreen = element.requestFullscreen || element.webkitRequestFullscreen
    if (requestFullscreen) void Promise.resolve(requestFullscreen.call(element)).catch(() => undefined)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === ' ') { event.preventDefault(); togglePlayback() }
    if (event.key === 'ArrowLeft') { event.preventDefault(); seekBy(-10) }
    if (event.key === 'ArrowRight') { event.preventDefault(); seekBy(10) }
    if (event.key.toLowerCase() === 'f') { event.preventDefault(); toggleFullscreen() }
    if (event.key.toLowerCase() === 'm') { event.preventDefault(); toggleMute() }
  }

  return (
    <div className="video-player-container" tabIndex={0} onKeyDown={handleKeyDown} aria-label="Video player. Space to play or pause, arrow keys to seek.">
      <div ref={containerRef} className="player-embed" />
      {loading && <div className="player-state" role="status">Loading player…</div>}
      {error && <div className="player-state error" role="alert"><strong>Couldn’t load this video</strong><span>{error}</span></div>}
      {!loading && !error && ready && <div className="player-controls" aria-label="Playback controls">
        <button onClick={togglePlayback} aria-label={playing ? 'Pause video' : 'Play video'}>{playing ? '❚❚' : '▶'}</button>
        <button onClick={() => seekBy(-10)} aria-label="Seek back 10 seconds">−10</button>
        <button onClick={() => seekBy(10)} aria-label="Seek forward 10 seconds">+10</button>
        <input className="player-seek" type="range" min="0" max={duration || 1} step="1" value={Math.min(position, duration || 1)} onChange={(event) => { const nextPosition = Number(event.target.value); playerRef.current?.seek(nextPosition); setPosition(nextPosition); onPositionChangeRef.current?.(nextPosition) }} aria-label="Seek through video" />
        <span className="player-time">{formatTime(position)} / {formatTime(duration)}</span>
        <select value={speed} onChange={(event) => changeSpeed(Number(event.target.value))} aria-label="Playback speed">
          {[0.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}
        </select>
        <button onClick={toggleMute} aria-label={muted ? 'Unmute video' : 'Mute video'}>{muted ? 'Unmute' : 'Mute'}</button>
        <button onClick={toggleFullscreen} aria-label="Enter fullscreen">Fullscreen</button>
        {onShareMoment && <button className="moment-control" onClick={() => onShareMoment(playerRef.current?.getPlaybackPosition() ?? position)}>Share Moment ↗</button>}
      </div>}
    </div>
  )
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remaining}`
}
