import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// === Appwrite WebSocket State Safe Patch ===
// Prevents uncaught Appwrite SDK errors: "WebSocket is already in CLOSING or CLOSED state."
if (typeof window !== 'undefined' && window.WebSocket) {
  const originalSend = window.WebSocket.prototype.send;
  window.WebSocket.prototype.send = function (...args) {
    if (this.readyState === window.WebSocket.OPEN) {
      try {
        originalSend.apply(this, args);
      } catch (err) {
        // Suppress CLOSING or CLOSED state warnings
        if (err && err.message && (err.message.includes('CLOSING') || err.message.includes('CLOSED'))) {
          // Silent catch
          return;
        }
        throw err;
      }
    }
  };
}


createRoot(document.getElementById('root')).render(
  <App />
);
