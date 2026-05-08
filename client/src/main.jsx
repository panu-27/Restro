import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import MenuPreview from './components/MenuPreview.jsx'
import { topLoader } from './components/TopLoader.jsx'

// Use the production URL from .env if it exists, otherwise fallback to the relative path
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

// ── Axios ↔ TopLoader wiring ──────────────────────────────────────────────────
// Every request triggers the loader; every response (or error) finishes it.
axios.interceptors.request.use((config) => {
  topLoader.start();
  return config;
}, (error) => {
  topLoader.done();
  return Promise.reject(error);
});

axios.interceptors.response.use((response) => {
  topLoader.done();
  return response;
}, (error) => {
  topLoader.done();
  return Promise.reject(error);
});

const path = window.location.pathname;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {path === '/preview' ? <MenuPreview /> : <App />}
  </StrictMode>,
)
