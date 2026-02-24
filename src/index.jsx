import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  React.createElement(ErrorBoundary, null,
    React.createElement(App)
  )
);

// Force clear old service workers on load, then register fresh
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.update());
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
