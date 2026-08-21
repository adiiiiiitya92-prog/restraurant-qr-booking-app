import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// PWA Service Worker Registration
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('PWA: New content available, please refresh.');
      },
      onOfflineReady() {
        console.log('PWA: App is ready for offline shell usage.');
      },
    });
  }).catch(() => {
    // virtual:pwa-register might not be present in some dev environments
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
