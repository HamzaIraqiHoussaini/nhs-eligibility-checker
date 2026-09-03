import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="National Honor Society Portal Error" fallbackMessage="An unexpected application error occurred. Please refresh or return to the dashboard.">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
