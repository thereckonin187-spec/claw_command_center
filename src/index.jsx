import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import ElizabethApp from './ElizabethApp';

// Global error handler — shows errors on screen if React fails to mount
window.onerror = function(msg, src, line, col, err) {
  const el = document.getElementById('root');
  if (el && !el.hasChildNodes()) {
    el.innerHTML = '<div style="background:#0a0f0a;color:#ff4444;padding:40px;font-family:monospace;min-height:100vh">' +
      '<h1>COMMAND CENTER — LOAD ERROR</h1>' +
      '<pre style="color:#ffb631;white-space:pre-wrap;margin-top:20px">' + String(msg) + '</pre>' +
      '<pre style="color:#18ff6d;white-space:pre-wrap;margin-top:10px;font-size:0.8rem">' + String(src) + ':' + line + ':' + col + '</pre>' +
      '<button onclick="localStorage.clear();caches.keys().then(k=>k.forEach(c=>caches.delete(c)));navigator.serviceWorker.getRegistrations().then(r=>r.forEach(s=>s.unregister()));setTimeout(()=>location.reload(),500)" ' +
      'style="margin-top:20px;padding:10px 20px;background:#18ff6d;color:#000;border:none;cursor:pointer;font-family:monospace">FULL RESET & RELOAD</button></div>';
  }
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("CC Error Boundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: { background: '#0a0f0a', color: '#18ff6d', padding: 40, fontFamily: 'monospace', minHeight: '100vh' }
      },
        React.createElement('h1', { style: { color: '#ff4444' } }, 'COMMAND CENTER — RUNTIME ERROR'),
        React.createElement('pre', { style: { color: '#ffb631', whiteSpace: 'pre-wrap', marginTop: 20 } },
          String(this.state.error?.message || this.state.error)),
        React.createElement('pre', { style: { color: '#18ff6d', whiteSpace: 'pre-wrap', marginTop: 10, fontSize: '0.8rem' } },
          String(this.state.error?.stack || '')),
        React.createElement('button', {
          onClick: () => {
            localStorage.clear();
            caches.keys().then(k => k.forEach(c => caches.delete(c)));
            navigator.serviceWorker.getRegistrations().then(r => r.forEach(s => s.unregister()));
            setTimeout(() => window.location.reload(), 500);
          },
          style: { marginTop: 20, padding: '10px 20px', background: '#18ff6d', color: '#000', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }
        }, 'FULL RESET & RELOAD')
      );
    }
    return this.props.children;
  }
}

// Spotify OAuth callback handler
function SpotifyCallback() {
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const verifier = localStorage.getItem('spotify_code_verifier');
    if (code && verifier) {
      const clientId = '1419a48fc3514d2da2c9c0b9315828bc';
      const redirectUri = window.location.origin + '/callback';
      fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
          code_verifier: verifier,
        }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.access_token) {
            localStorage.setItem('spotify_access_token', data.access_token);
            localStorage.setItem('spotify_refresh_token', data.refresh_token || '');
            localStorage.setItem('spotify_token_expiry', String(Date.now() + data.expires_in * 1000));
          }
          window.location.href = '/';
        })
        .catch(() => { window.location.href = '/'; });
    } else {
      window.location.href = '/';
    }
  }, []);
  return React.createElement('div', {
    style: { background: '#0a0f0a', color: '#18ff6d', padding: 40, fontFamily: 'monospace', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  }, React.createElement('div', null, 'Authenticating with Spotify...'));
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  React.createElement(ErrorBoundary, null,
    React.createElement(BrowserRouter, null,
      React.createElement(Routes, null,
        React.createElement(Route, { path: '/', element: React.createElement(App) }),
        React.createElement(Route, { path: '/elizabeth', element: React.createElement(ElizabethApp) }),
        React.createElement(Route, { path: '/callback', element: React.createElement(SpotifyCallback) })
      )
    )
  )
);

// Unregister all service workers — previous versions caused stale cache issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.unregister());
  });
}
