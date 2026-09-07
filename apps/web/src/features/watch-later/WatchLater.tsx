import React, { useCallback, useEffect, useState } from 'react'
import type { ClearPlayDB } from '../../storage/db'
import { watchLaterRepository } from '../../storage/repository'
import '../library/Library.css'

type WatchLaterEntry = ClearPlayDB['watchLater']['value']

interface WatchLaterProps {
  onOpen: (url: string) => void
}

export const WatchLater: React.FC<WatchLaterProps> = ({ onOpen }) => {
  const [entries, setEntries] = useState<WatchLaterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadWatchLater = useCallback(async () => {
    try {
      const records = await watchLaterRepository.getAll()
      setEntries(records.sort((first, second) => second.addedAt - first.addedAt))
    } catch {
      setError('Watch Later could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWatchLater()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadWatchLater])

  const retryLoadWatchLater = () => {
    setLoading(true)
    setError(null)
    void loadWatchLater()
  }

  const removeEntry = async (url: string) => {
    try {
      await watchLaterRepository.remove(url)
      setEntries((current) => current.filter((entry) => entry.url !== url))
    } catch {
      setError('The saved video could not be removed.')
    }
  }

  const clearSaved = async () => {
    if (!window.confirm('Remove all saved videos from this device?')) return
    try {
      await Promise.all(entries.map((entry) => watchLaterRepository.remove(entry.url)))
      setEntries([])
    } catch {
      setError('Saved videos could not be cleared.')
    }
  }

  return (
    <section className="library-page container">
      <div className="library-heading">
        <div>
          <p className="eyebrow">Saved for another time</p>
          <h1>Watch Later</h1>
        </div>
        {entries.length > 0 && <button className="library-action" onClick={() => void clearSaved()}>Clear saved</button>}
      </div>
      {loading && <p className="library-state loading-state">Loading saved videos…</p>}
      {!loading && error && <div className="library-state error"><p>{error}</p><button className="library-action" onClick={retryLoadWatchLater}>Try again</button></div>}
      {!loading && !error && entries.length === 0 && <div className="library-state empty-state"><strong>Nothing saved yet.</strong><span>Save videos here and come back whenever you’re ready.</span></div>}
      {!loading && !error && entries.length > 0 && (
        <div className="library-list">
          {entries.map((entry) => (
            <div className="library-item" key={entry.url}>
              <button className="library-item-main" onClick={() => onOpen(entry.url)}>
                {entry.thumbnail && <img src={entry.thumbnail} alt="" className="library-thumbnail" />}
                <span className="library-item-copy"><strong>{entry.title}</strong><span>Added {new Date(entry.addedAt).toLocaleDateString()}</span></span>
              </button>
              <button className="library-remove" onClick={() => removeEntry(entry.url)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
