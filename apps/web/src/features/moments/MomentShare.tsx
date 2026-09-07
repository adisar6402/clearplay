import { useEffect, useRef, useState } from 'react'
import type { VideoMetadata } from '@clearplay/core'
import './MomentShare.css'

interface MomentShareProps {
  metadata: VideoMetadata
  position: number
  url: string
  onClose: () => void
}

export function MomentShare({ metadata, position, url, onClose }: MomentShareProps) {
  const [message, setMessage] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const timestamp = formatTime(position)

  useEffect(() => {
    dialogRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const copyLink = async () => {
    try {
      await copyToClipboard(url)
      setMessage('Copied ✓')
    } catch {
      setMessage('Copy unavailable — select the link below.')
    }
  }

  const share = async () => {
    if (!navigator.share) {
      await copyLink()
      return
    }

    try {
      await navigator.share({
        title: metadata.title || 'A ClearPlay Moment',
        text: `Check out this moment on ClearPlay — ${timestamp}`,
        url,
      })
      setMessage('Shared ✓')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setMessage('Sharing is unavailable — try Copy link.')
    }
  }

  const saveImage = () => {
    const svg = createMomentCard(metadata, timestamp)
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const downloadUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = downloadUrl
    anchor.download = `clearplay-moment-${timestamp.replace(':', '-')}.svg`
    anchor.click()
    URL.revokeObjectURL(downloadUrl)
    setMessage('Image saved ✓')
  }

  return (
    <div
      className="moment-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="moment-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="moment-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="moment-dialog-header">
          <div>
            <p className="eyebrow">CLEARPLAY MOMENT</p>
            <h2 id="moment-title">Share this moment</h2>
          </div>

          <button
            className="moment-close"
            onClick={onClose}
            aria-label="Close share moment dialog"
          >
            ×
          </button>
        </div>

        <div className="moment-card">
          {metadata.thumbnail ? (
            <img src={metadata.thumbnail} alt="" />
          ) : (
            <div className="moment-card-fallback" aria-hidden="true">
              CLEARPLAY
            </div>
          )}

          <div className="moment-card-overlay" />

          <div className="moment-card-copy">
            <strong>{timestamp}</strong>
            <span>WATCH THIS MOMENT →</span>
          </div>
        </div>

        <p className="moment-title">{metadata.title || 'Untitled video'}</p>

        {metadata.author && (
          <p className="moment-author">{metadata.author}</p>
        )}

        <p className="moment-link" title={url}>
          {url}
        </p>

        <div className="moment-actions">
          <button
            className="action-button primary-action"
            onClick={() => void copyLink()}
          >
            Copy link
          </button>

          <button
            className="action-button"
            onClick={() => void share()}
          >
            Share
          </button>

          <button
            className="action-button"
            onClick={saveImage}
          >
            Save image
          </button>
        </div>

        {message && (
          <p className="inline-feedback" role="status">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(
    0,
    Math.floor(Number.isFinite(seconds) ? seconds : 0),
  )

  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0')

  const remaining = (safeSeconds % 60)
    .toString()
    .padStart(2, '0')

  return hours > 0
    ? `${hours}:${minutes}:${remaining}`
    : `${Math.floor(safeSeconds / 60)
        .toString()
        .padStart(2, '0')}:${remaining}`
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value)
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

  if (!copied) {
    throw new Error('Clipboard unavailable')
  }
}

function createMomentCard(metadata: VideoMetadata, timestamp: string) {
  const title = escapeXml(metadata.title || 'Untitled video').slice(0, 90)
  const author = escapeXml(metadata.author || '').slice(0, 60)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#080a0d"/><rect x="40" y="40" width="1120" height="550" rx="24" fill="#12161b" stroke="#27313b"/><text x="96" y="126" fill="#b7f36b" font-family="Arial,sans-serif" font-size="24" font-weight="700" letter-spacing="5">CLEARPLAY</text><text x="96" y="330" fill="#ffffff" font-family="Arial,sans-serif" font-size="140" font-weight="700">${timestamp}</text><text x="96" y="420" fill="#ffffff" font-family="Arial,sans-serif" font-size="34" font-weight="700">${title}</text><text x="96" y="468" fill="#9ba7b4" font-family="Arial,sans-serif" font-size="22">${author}</text><text x="96" y="540" fill="#b7f36b" font-family="Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="2">WATCH THIS MOMENT →</text></svg>`
}

function escapeXml(value: string) {
  const entities: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  }

  return value.replace(/[<>&'"]/g, (character) => entities[character] || character)
}
