import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/geologica/400.css'
import '@fontsource/geologica/600.css'
import '@fontsource/geologica/700.css'
import '@fontsource/roboto-mono/500.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
