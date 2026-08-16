import { AnimatePresence, motion } from 'motion/react'
import { Check, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CopyStatus } from '@/lib/use-media-clipboard'

interface CopyIconButtonProps {
  status: CopyStatus
  onClick: () => void
  /** Idle-state glyph (e.g. Image, Braces, Code). Morphs to Check on success, X on error. */
  icon: LucideIcon
  label: string
  className?: string
}

const GLYPH_STYLE = {
  width: 'var(--icon-button-glyph-size)',
  height: 'var(--icon-button-glyph-size)',
}

const SPRING = { type: 'spring', stiffness: 500, damping: 30 } as const

/**
 * Icon button that morphs its glyph to a success ✓ (or error ✕) when the copy
 * action resolves, then reverts. Presentational and app-agnostic — the icon and
 * behavior arrive as props; the only dependencies are motion + lucide + `cn`.
 */
export function CopyIconButton({ status, onClick, icon: Icon, label, className }: CopyIconButtonProps) {
  const done = status === 'done'
  const error = status === 'error'
  const key = done ? 'done' : error ? 'error' : 'idle'
  const Glyph = done ? Check : error ? X : Icon

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick()
      }}
      className={cn(
        'app-icon-button app-icon-button-transparent transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0',
        className,
      )}
      aria-label={label}
      title={label}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={key}
          initial={{ scale: 0, opacity: 0, rotate: done ? -30 : 0 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={SPRING}
          className={cn('inline-flex', done && 'text-emerald-400', error && 'text-destructive')}
        >
          <Glyph style={GLYPH_STYLE} />
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
