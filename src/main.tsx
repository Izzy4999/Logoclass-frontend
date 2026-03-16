import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – no type declarations for this CSS-only package
import '@livekit/components-styles'
import App from './App.tsx'
import { ErrorBoundary } from './components/shared/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
