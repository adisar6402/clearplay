import React, { useCallback, useEffect, useState } from 'react'
import type { ClearPlayDB } from '../../storage/db'
import { historyRepository } from '../../storage/repository'
import '../library/Library.css'

type HistoryEntry = ClearPlayDB['history']['value']

interface HistoryProps {
  onOpen: (url: string, position?: number) => void
}

export const History: React.FC<HistoryProps> = ({ onOpen }) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      const records = await historyRepository.getAll()
      setEntries(records.sort((first, second) => second.timestamp - first.timestamp))
    } catch {
      setError('History could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHistory()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadHistory])

  const retryLoadHistory = () => {
    setLoading(true)
    setError(null)
    void loadHistory()
  }

  const clearHistory = async () => {
    if (!window.confirm('Clear all viewing history from this device?')) return
    try {
      await historyRepository.clear()
      setEntries([])
    } catch {
      setError('History could not be cleared.')
    }
  }

  return (
    <section className="library-page container">
      <div className="library-heading">
        <div>
          <p className="eyebrow">Your viewing history</p>
          <h1>History</h1>
        </div>
        {entries.length > 0 && <button className="library-action" onClick={clearHistory}>Clear history</button>}
      </div>
      {loading && <p className="library-state loading-state">Loading your history…</p>}
      {!loading && error && <div className="library-state error"><p>{error}</p><button className="library-action" onClick={retryLoadHistory}>Try again</button></div>}
      {!loading && !error && entries.length === 0 && <div className="library-state empty-state"><strong>No videos here yet.</strong><span>Start watching and your history will appear here.</span></div>}
      {!loading && !error && entries.length > 0 && (
        <div className="library-list">
          {entries.map((entry) => (
            <button className="library-item" key={entry.url} onClick={() => onOpen(entry.url, entry.position)}>
              {entry.thumbnail && <img src={entry.thumbnail} alt="" className="library-thumbnail" />}
              <span className="library-item-copy"><strong>{entry.title}</strong><span>{entry.position ? `Resume at ${formatTime(entry.position)} · ` : ''}{new Date(entry.timestamp).toLocaleDateString()}</span>{entry.duration && entry.position ? <span className="progress-track"><span style={{ width: `${Math.min(100, (entry.position / entry.duration) * 100)}%` }} /></span> : null}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}` }
