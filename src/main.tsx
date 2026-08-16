import React from 'react'
import ReactDOM from 'react-dom/client'
// Switch between Apps:
import App from './components/markdown/EditorWithProview'
// import App from './components/ui/DesignTokenDemo'  // Design token testing
import { TooltipProvider } from '@/components/ui/tooltip'
import { UserSettingsProvider } from '@/lib/user-settings'
import { SidecarStatusProvider } from '@/lib/sidecar-status'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SidecarStatusProvider>
      <UserSettingsProvider>
        <TooltipProvider delayDuration={300}>
          <App />
        </TooltipProvider>
      </UserSettingsProvider>
    </SidecarStatusProvider>
  </React.StrictMode>,
)
