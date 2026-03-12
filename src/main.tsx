import React from 'react'
import ReactDOM from 'react-dom/client'
import EditorWithProview from './components/markdown/EditorWithProview'
import PoachedDemoApp from './PoachedDemoApp'
import { TooltipProvider } from '@/components/ui/tooltip'
import './styles/index.css'

const normalizePathname = (pathname: string) => {
  if (pathname === '/') {
    return pathname
  }

  return pathname.replace(/\/+$/, '')
}

const pathname = normalizePathname(window.location.pathname)
const App = pathname === '/demo' ? PoachedDemoApp : EditorWithProview

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={300}>
      <App />
    </TooltipProvider>
  </React.StrictMode>,
)
