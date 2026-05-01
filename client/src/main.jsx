import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'
import MenuPreview from './components/MenuPreview.jsx'

// Use the production URL from .env if it exists, otherwise fallback to the relative path
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

const path = window.location.pathname;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {path === '/preview' ? <MenuPreview /> : <App />}
  </StrictMode>,
)
