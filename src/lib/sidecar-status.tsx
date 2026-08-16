import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { markSidecarOffline, markSidecarOnline } from './storage'

export type SidecarStatus = 'connecting' | 'online' | 'offline'

const SidecarStatusContext = createContext<SidecarStatus>('connecting')
const EVENTS_URL = '/api/db/events'
const HEALTH_URL = '/api/db/health'
const RECONNECT_MIN_MS = 250
const RECONNECT_MAX_MS = 2_000

export function SidecarStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SidecarStatus>('connecting')

  useEffect(() => {
    let source: EventSource | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let delay = RECONNECT_MIN_MS
    let disposed = false

    const markOffline = () => {
      if (disposed) return
      setStatus('offline')
      markSidecarOffline()
    }

    const connect = () => {
      if (disposed) return
      source?.close()
      source = new EventSource(EVENTS_URL)
      source.addEventListener('ready', () => {
        delay = RECONNECT_MIN_MS
        setStatus('online')
        markSidecarOnline()
      })
      source.addEventListener('heartbeat', () => {
        delay = RECONNECT_MIN_MS
        setStatus('online')
      })
      source.onerror = () => {
        source?.close()
        markOffline()
        probe()
      }
    }

    const probe = () => {
      if (disposed || timer) return
      timer = setTimeout(async () => {
        timer = null
        try {
          const response = await fetch(HEALTH_URL)
          const payload = await response.json()
          if (!response.ok || payload?.status !== 'ready' || payload?.database !== 'ready') {
            throw new Error('Sidecar is not ready')
          }
          setStatus('connecting')
          connect()
        } catch {
          delay = Math.min(delay * 2, RECONNECT_MAX_MS)
          probe()
        }
      }, delay)
    }

    connect()
    return () => {
      disposed = true
      source?.close()
      if (timer) clearTimeout(timer)
    }
  }, [])

  return <SidecarStatusContext.Provider value={status}>{children}</SidecarStatusContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- hook is co-located with its provider
export function useSidecarStatus(): SidecarStatus {
  return useContext(SidecarStatusContext)
}
