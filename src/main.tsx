import React from 'react'
import ReactDOM from 'react-dom/client'
// Switch between Apps:
import App from './components/markdown/EditorWithProview'
// import App from './TabsDemoApp'  // TabSystem demo
// import App from './components/ui/DesignTokenDemo'  // Design token testing
import { Toaster } from 'sonner'
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
          <Toaster position="bottom-right" theme="system" richColors closeButton />
        </TooltipProvider>
      </UserSettingsProvider>
    </SidecarStatusProvider>
  </React.StrictMode>,
)
