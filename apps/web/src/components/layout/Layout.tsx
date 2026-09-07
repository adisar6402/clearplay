import React from 'react';
import { InstallPrompt } from '../install/InstallPrompt';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
  focusMode?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, onNavigate, focusMode = false }) => {

  const currentPath = window.location.pathname
  const handleNavigation = (event: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    event.preventDefault();
    onNavigate(path);
  };

  return (
    <div className={`layout ${focusMode ? 'layout-focus' : ''}`}>
      <header className="header" aria-label="Primary navigation">
        <div className="container header-content">
          <a href="/" className="logo" onClick={(event) => handleNavigation(event, '/')}>
            <img className="logo-lockup" src="/logos/clearplay-header-logo.svg" alt="ClearPlay" />
          </a>
          <nav className="nav">
            <a href="/history" className="nav-link" aria-current={currentPath === '/history' ? 'page' : undefined} onClick={(event) => handleNavigation(event, '/history')}>History</a>
            <a href="/watch-later" className="nav-link" aria-current={currentPath === '/watch-later' ? 'page' : undefined} onClick={(event) => handleNavigation(event, '/watch-later')}>Watch later</a>
            <a href="/preferences" className="nav-link" aria-current={currentPath === '/preferences' ? 'page' : undefined} onClick={(event) => handleNavigation(event, '/preferences')}>Preferences</a>
          </nav>
        </div>
      </header>
      {!focusMode && <InstallPrompt />}
      <main className="main">
        {children}
      </main>
      <footer className="footer">
        <div className="container footer-content">
          <span className="footer-brand">
            <img className="footer-logo footer-logo-dark" src="/logos/clearplay-logo-white.svg" alt="ClearPlay — Watch what you came for." />
            <img className="footer-logo footer-logo-light" src="/logos/clearplay-logo-black.svg" alt="" />
          </span>
          <p>&copy; {new Date().getFullYear()} ClearPlay. Your viewing stays on this device.</p>
        </div>
      </footer>
    </div>
  );
};
