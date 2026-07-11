/**
 * PersistenceStatus — tells the user when their work is not reaching the database.
 *
 * Persistence failures used to be silent: with the sidecar down, the editor kept
 * accepting edits that went nowhere. This banner makes the degraded state visible.
 * It is not dismissible while offline — the point is that the user should know.
 */

import { useEffect, useState } from 'react'
import { CloudOff, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStatus, subscribe, type StorageStatus } from '@/lib/storage'

export function PersistenceStatus() {
  const [status, setStatus] = useState<StorageStatus>(getStatus)

  useEffect(() => subscribe(setStatus), [])

  if (status === 'online' || status === 'connecting') return null

  const bufferFull = status === 'buffer-full'

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-1.5',
        'text-xs font-medium border-b',
        bufferFull
          ? 'bg-destructive/10 border-destructive/30 text-destructive'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400',
      )}
    >
      {bufferFull ? (
        <>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Local backup is full — new changes may not be saved. Free up browser storage.
          </span>
        </>
      ) : (
        <>
          <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Storage offline — changes are saved locally and will sync automatically.
          </span>
        </>
      )}
    </div>
  )
}

PersistenceStatus.displayName = 'PersistenceStatus'
