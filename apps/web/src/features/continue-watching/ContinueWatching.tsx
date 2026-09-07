import { useCallback, useEffect, useState } from 'react'
import type { ClearPlayDB } from '../../storage/db'
import { continueWatchingRepository } from '../../storage/repository'

type ContinueEntry = ClearPlayDB['continueWatching']['value']

interface ContinueWatchingProps { onOpen: (url: string, position?: number) => void }

export function ContinueWatching({ onOpen }: ContinueWatchingProps) {
  const [entries, setEntries] = useState<ContinueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const load = useCallback(() => {
    setLoading(true)
    setError(false)
    void getContinueEntries()
      .then(setEntries)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => {
    void getContinueEntries()
      .then(setEntries)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])
  if (loading) return <section className="continue-section container" aria-labelledby="continue-heading"><p className="library-state">Loading your progress...</p></section>
  if (error) return <section className="continue-section container" aria-labelledby="continue-heading"><p className="library-state error">Your progress could not be loaded. <button className="library-action" onClick={load}>Try again</button></p></section>
  if (entries.length === 0) return null
  return <section className="continue-section container" aria-labelledby="continue-heading">
    <div className="section-heading"><div><p className="eyebrow">Pick up where you left off</p><h2 id="continue-heading">Continue watching</h2></div></div>
    <div className="continue-list">{entries.slice(0, 4).map((entry) => {
      const progress = entry.duration > 0 ? Math.min(100, (entry.position / entry.duration) * 100) : 0
      return <button className="continue-card" key={entry.url} onClick={() => onOpen(entry.url, entry.position)}>
        {entry.thumbnail && <img src={entry.thumbnail} alt="" />}
        <span className="continue-copy"><strong>{entry.title}</strong><span>{formatTime(entry.position)} watched</span><span className="progress-track"><span style={{ width: `${progress}%` }} /></span></span>
      </button>
    })}</div>
  </section>
}

function getContinueEntries() {
  return continueWatchingRepository.getAll().then((items) => items.sort((a, b) => b.updatedAt - a.updatedAt))
}

function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}` }
