import { useEffect, useState } from 'react'
import './InstallPrompt.css'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}


const DISMISSED_KEY = 'clearplay.install.dismissed'
const INSTALLED_KEY = 'clearplay.install.installed'

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
const isAppleDevice = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isAppleSafari = () => isAppleDevice() && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent)
const getInitialInstalledState = () => {
  if (localStorage.getItem(INSTALLED_KEY) === 'true') return true
  if (!isStandalone()) return false
  localStorage.setItem(INSTALLED_KEY, 'true')
  return true
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === 'true')
  const [installed, setInstalled] = useState(getInitialInstalledState)
  const [isInstalling, setIsInstalling] = useState(false)
  const [showIosSteps, setShowIosSteps] = useState(false)
  const appleSafari = isAppleSafari()

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, 'true')
      setInstalled(true)
      setInstallEvent(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  const install = async () => {
    if (!installEvent || isInstalling) return
    setIsInstalling(true)
    try {
      await installEvent.prompt()
      const choice = await installEvent.userChoice
      if (choice.outcome === 'accepted') {
        localStorage.setItem(INSTALLED_KEY, 'true')
        setInstalled(true)
      }
    } finally {
      setInstallEvent(null)
      setIsInstalling(false)
    }
  }

  if (dismissed || installed || (!appleSafari && !installEvent)) return null

  return (
    <aside className="install-prompt" aria-label="Install ClearPlay">
      <div className="install-prompt-mark" aria-hidden="true">
        <img src="/logos/clearplay-symbol.svg" alt="" />
      </div>
      <div className="install-prompt-copy">
        <p className="install-prompt-title">Keep ClearPlay one tap away?</p>
        <p className="install-prompt-description">
          {appleSafari ? <>Add ClearPlay to your Home Screen for a faster launch.{showIosSteps && <span id="install-ios-steps"> 1. Tap <strong>Share</strong> in Safari. 2. Tap <strong>Add to Home Screen</strong>.</span>}</> : 'Install the app shell for a faster launch.'}
        </p>
      </div>
      {appleSafari ? <button className="install-prompt-action" type="button" onClick={() => setShowIosSteps(true)} aria-expanded={showIosSteps} aria-controls="install-ios-steps">{showIosSteps ? 'Steps shown' : 'How to Install'}</button> : <button className="install-prompt-action" type="button" onClick={() => void install()} disabled={isInstalling}>{isInstalling ? 'Opening…' : 'Install ClearPlay'}</button>}
      <button className="install-prompt-dismiss" type="button" onClick={dismiss} aria-label="Dismiss install prompt">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
      </button>
    </aside>
  )
}
