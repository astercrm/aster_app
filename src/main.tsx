import {StrictMode, Component, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ── Error Boundary: catches React render errors and shows them ──────────────
class ErrorBoundary extends Component<{children: ReactNode}, {error: Error | null}> {
  declare props: {children: ReactNode};
  state: {error: Error | null} = {error: null};
  static getDerivedStateFromError(error: Error) { return {error}; }
  componentDidCatch(error: Error, info: any) {
    console.error('🔴 React Error Boundary caught:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding: '40px', fontFamily: 'system-ui', maxWidth: '600px', margin: '40px auto'}}>
          <h1 style={{color: '#dc2626', fontSize: '24px', marginBottom: '16px'}}>Something went wrong</h1>
          <pre style={{background: '#fef2f2', padding: '16px', borderRadius: '8px', overflow: 'auto', fontSize: '13px', color: '#991b1b', whiteSpace: 'pre-wrap'}}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{marginTop: '16px', padding: '10px 20px', background: '#2754F5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'}}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Mount app with error boundary ───────────────────────────────────────────
try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
} catch (e) {
  // If even the render call fails, show something
  document.getElementById('root')!.innerHTML = `
    <div style="padding:40px;font-family:system-ui;text-align:center">
      <h1 style="color:#dc2626">Failed to start app</h1>
      <pre style="background:#fef2f2;padding:16px;border-radius:8px;text-align:left;overflow:auto">${e}</pre>
    </div>`;
}

// ── Service Worker ──────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('SW registered'))
      .catch(() => console.log('SW failed'));
  });
}