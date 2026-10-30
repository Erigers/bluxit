import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { isDesktop } from './desktop'
import { watchPwaUpdates } from './pwa'
import './index.css'

if (!isDesktop()) watchPwaUpdates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
