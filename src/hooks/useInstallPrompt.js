import { useEffect, useState } from 'react';

// Chrome/Edge/Android fire `beforeinstallprompt` once, sometimes before React
// has mounted, so main.jsx calls captureInstallPrompt() at startup and we keep
// the event here until the Install button is pressed.
let deferredPrompt = null;
const EVENT = 'junio8:installable-changed';

export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own button instead of the mini-infobar
    deferredPrompt = e;
    window.dispatchEvent(new Event(EVENT));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event(EVENT));
  });
}

export function isRunningAsInstalledApp() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS Safari
  );
}

export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(() => Boolean(deferredPrompt));

  useEffect(() => {
    const update = () => setCanInstall(Boolean(deferredPrompt));
    window.addEventListener(EVENT, update);
    update();
    return () => window.removeEventListener(EVENT, update);
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return 'unavailable';
    const prompt = deferredPrompt;
    deferredPrompt = null; // the event can only be used once
    setCanInstall(false);
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    return outcome; // 'accepted' | 'dismissed'
  };

  return { canInstall, promptInstall };
}
