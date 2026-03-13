import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';

const container = document.getElementById('root');

const root = createRoot(container);

// Disable zoom and scaling globally
window.addEventListener(
  'wheel',
  function (e) {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  },
  { passive: false }
);
window.addEventListener('keydown', function (e) {
  // Prevent Ctrl + '+', Ctrl + '-', Ctrl + '0' (reset)
  if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
    e.preventDefault();
  }
});
window.addEventListener('gesturestart', function (e) {
  e.preventDefault();
});

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
