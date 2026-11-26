import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { captureInstallPrompt } from './hooks/useInstallPrompt';

// Catch the browser's "you can install this app" event as early as possible.
captureInstallPrompt();

// Recover gracefully if a dynamic chunk fails to load (e.g. after a redeployment
// when old chunk hashes expire on the server).
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

// PWA service worker:
// In development: actively unregister any leftover service worker registered on localhost
// by previous preview/production runs and purge caches, so dev never serves stale bundles.
// In production: register the auto-updating service worker and poll every 30 minutes.
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
  } else if (import.meta.env.PROD) {
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
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
