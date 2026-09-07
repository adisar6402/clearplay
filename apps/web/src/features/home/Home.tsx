import React, { useState } from 'react';
import './Home.css';
import { ContinueWatching } from '../continue-watching/ContinueWatching'

interface HomeProps {
  onImport: (url: string) => void;
  importError?: string | null;
  unsupportedUrl?: string | null;
  unsupportedPlatform?: string | null;
  onOpen: (url: string, position?: number) => void;
}

export const Home: React.FC<HomeProps> = ({ onImport, importError, unsupportedUrl, unsupportedPlatform, onOpen }) => {
  const [url, setUrl] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onImport(url.trim());
    }
  };

  const pasteUrl = async () => {
    try {
      const value = await navigator.clipboard?.readText()
      if (!value) throw new Error('empty')
      setUrl(value.trim())
      setPasteError(null)
    } catch {
      setPasteError('Paste is unavailable here. You can paste the link into the field.')
    }
  }

  return (
    <div className="home">
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">WATCH WHAT YOU CAME FOR.</h1>
          <p className="hero-tagline">
            A quieter way to watch. Bring the link; ClearPlay keeps the rest out of the way.
          </p>
          <form className="import-form" onSubmit={handleSubmit}>
            <input
              type="text"
              aria-label="Video URL"
              className="import-input"
              placeholder="Paste a video link"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
            />
            <button type="button" className="paste-button" onClick={() => void pasteUrl()}>
              Paste link
            </button>
            <button type="submit" className="import-button" disabled={!url.trim()}>
              Watch
            </button>
          </form>
          {pasteError && <p className="paste-error" role="status">{pasteError}</p>}
          {importError && <p className="import-error" role="alert">{importError}</p>}
          {unsupportedUrl && unsupportedPlatform && <a className="external-action" href={unsupportedUrl} target="_blank" rel="noreferrer">Open on {unsupportedPlatform} →</a>}
        </div>
      </section>

      <section className="value-propositions container" aria-label="The ClearPlay principles">
        <article className="value-proposition">
          <span className="value-index" aria-hidden="true">01 / PRINCIPLE</span>
          <h2>Distraction-Free</h2>
          <p>No comments, no sidebars, no related videos. Just the content.</p>
        </article>
        <article className="value-proposition">
          <span className="value-index" aria-hidden="true">02 / PRINCIPLE</span>
          <h2>Focus Mode</h2>
          <p>One-click to minimize all UI and focus entirely on the video.</p>
        </article>
        <article className="value-proposition">
          <span className="value-index" aria-hidden="true">03 / PRINCIPLE</span>
          <h2>Local-First</h2>
          <p>Your history and saved videos stay on your device. Privacy by design.</p>
        </article>
      </section>

      <ContinueWatching onOpen={onOpen} />

    </div>
  );
};
