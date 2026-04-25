import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { registerDeadChunkReload } from './build/deadChunkReload';
import { registerMbdServiceWorker } from './build/registerServiceWorker';
import { initWebVitals } from './shared/lib/webVitals';
import './globals.css';

registerDeadChunkReload();
registerMbdServiceWorker();
initWebVitals();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
