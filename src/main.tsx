import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { migrate } from './lib/migrate';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Run migrations on boot
migrate();

// Service worker: only register in production; dev 环境注销，避免缓存旧代码
if ('serviceWorker' in navigator) {
  // @ts-ignore
  if (import.meta && import.meta.env && import.meta.env.PROD) {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => {});
  } else {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
    if ('caches' in window) {
      // @ts-ignore
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
    }
  }
}
