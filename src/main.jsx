import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { captureInstallPrompt } from './hooks/useInstallPrompt';

// Catch the browser's "you can install this app" event as early as possible.
captureInstallPrompt();

// PWA service worker (production builds only; dev never caches, so changes show instantly).
// registerType is 'autoUpdate': when a new version is deployed the service worker
// updates itself and the open app reloads onto the new version.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onOfflineReady() {
          console.info('PWA: app shell cached, works offline.');
        },
        onRegisteredSW(_url, registration) {
          // Check for a new version every 30 minutes (kitchen tablets stay open all day).
          if (registration) {
            setInterval(() => registration.update().catch(() => {}), 30 * 60 * 1000);
          }
        },
        onRegisterError(err) {
          console.warn('PWA: service worker registration failed', err);
        },
      });
      return updateSW;
    })
    .catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
