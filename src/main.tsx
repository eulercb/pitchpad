import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted variable fonts (bundled + precached for offline). Fraunces "full"
// carries the SOFT/WONK axes the design drives.
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/public-sans/index.css'
import './index.css'
import './runtime' // wire the engine singletons (side effects)
import { App } from './ui/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
