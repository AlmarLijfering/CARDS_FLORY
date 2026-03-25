import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import './index.css';

if (typeof window !== 'undefined' && !window.location.hash && window.location.pathname !== '/') {
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const basePath = baseUrl || '';
  const { origin, pathname, search } = window.location;

  if (basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))) {
    const routePath = pathname === basePath ? '/' : pathname.slice(basePath.length);
    window.location.replace(`${origin}${basePath}/#${routePath}${search}`);
  } else {
    const nextHash = `#${pathname}${search}`;
    window.location.replace(`${origin}/${nextHash}`);
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
