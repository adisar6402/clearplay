import type { UserPreferences } from '../../storage/db'
import '../library/Library.css'

interface PreferencesProps {
  preferences: UserPreferences
  onChange: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>
}

export function Preferences({ preferences, onChange }: PreferencesProps) {
  return (
    <section className="library-page container preferences-page">
      <div className="library-heading"><div><p className="eyebrow">Local on this device</p><h1>Preferences</h1></div></div>
      <div className="settings-list">
        <label className="setting-row"><span><strong>Auto-skip sponsors</strong><small>Only works when trusted segment data is available.</small></span><input type="checkbox" checked={preferences.autoSkipSponsor} onChange={(event) => void onChange('autoSkipSponsor', event.target.checked)} /></label>
        <label className="setting-row"><span><strong>Auto-skip intros</strong><small>Only works when trusted segment data is available.</small></span><input type="checkbox" checked={preferences.autoSkipIntro} onChange={(event) => void onChange('autoSkipIntro', event.target.checked)} /></label>
        <label className="setting-row"><span><strong>Auto-skip outros</strong><small>Never invents or estimates segment boundaries.</small></span><input type="checkbox" checked={preferences.autoSkipOutro} onChange={(event) => void onChange('autoSkipOutro', event.target.checked)} /></label>
        <label className="setting-row"><span><strong>Skip behavior</strong><small>Ask before skipping when you want control.</small></span><select value={preferences.skipMode} onChange={(event) => void onChange('skipMode', event.target.value as UserPreferences['skipMode'])}><option value="auto">Auto-skip</option><option value="ask">Ask before skipping</option></select></label>
        <label className="setting-row"><span><strong>Autoplay</strong><small>Start a loaded video automatically.</small></span><input type="checkbox" checked={preferences.autoplay} onChange={(event) => void onChange('autoplay', event.target.checked)} /></label>
        <label className="setting-row"><span><strong>Focus Mode</strong><small>Keep the player as the only thing on screen.</small></span><input type="checkbox" checked={preferences.focusMode} onChange={(event) => void onChange('focusMode', event.target.checked)} /></label>
        <label className="setting-row"><span><strong>Theme</strong><small>Choose the appearance for this device.</small></span><select value={preferences.theme} onChange={(event) => void onChange('theme', event.target.value as UserPreferences['theme'])}><option value="dark">Dark</option><option value="light">Light</option></select></label>
      </div>
    </section>
  )
}
