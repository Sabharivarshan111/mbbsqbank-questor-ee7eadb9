
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerNativeAuthListener } from './lib/native-auth'

// Register service worker for offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.error('ServiceWorker registration failed: ', error);
      });
  });
}

// Handle OAuth deep-link return on native (Android APK)
registerNativeAuthListener();

createRoot(document.getElementById("root")!).render(<App />);
