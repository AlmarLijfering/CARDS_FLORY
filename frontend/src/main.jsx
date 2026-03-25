import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './index.css';

if (typeof window !== 'undefined' && !window.location.hash && window.location.pathname !== '/') {
  const nextHash = `#${window.location.pathname}${window.location.search}`;
  window.location.replace(`${window.location.origin}/${nextHash}`);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
