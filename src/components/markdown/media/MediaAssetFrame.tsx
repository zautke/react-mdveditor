import { useCallback, useId, useRef, useState, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { Expand, Shrink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MediaAssetFrameProps {
  assetId?: string
  label: string
  className?: string
  modalClassName?: string
  contentClassName?: string
  copyLabel?: string
  onCopy?: () => Promise<void> | void
  renderContent: (options: { zoomed: boolean }) => ReactNode
}

const MEDIA_TRANSITION = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1] as const,
}

function ZoomButton({
  expanded,
  onClick,
  className,
}: {
  expanded: boolean
  onClick: () => void
  className?: string
}) {
  const Icon = expanded ? Shrink : Expand

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
      aria-label={expanded ? 'Collapse media' : 'Zoom media'}
      title={expanded ? 'Collapse media' : 'Zoom media'}
    >
      <Icon style={{ width: 'var(--icon-button-glyph-size)', height: 'var(--icon-button-glyph-size)' }} />
    </button>
  )
}

function MediaActionPanel({
  expanded,
  onToggle,
  inline,
}: {
  expanded: boolean
  onToggle: () => void
  inline?: boolean
}) {
  return (
    <div
      className={cn(
        'mdeditor-media-action-panel',
        inline && 'mdeditor-media-action-panel--inline',
      )}
    >
      <ZoomButton expanded={expanded} onClick={onToggle} />
    </div>
  )
}

export function MediaAssetFrame({
  assetId,
  label,
  className,
  modalClassName,
  contentClassName,
  renderContent,
}: MediaAssetFrameProps) {
  const generatedId = useId()
  const resolvedId = assetId ?? `media-${generatedId}`
  const layoutId = `${resolvedId}-surface`
  const inlineSurfaceRef = useRef<HTMLDivElement>(null)
  const modalSurfaceRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  const close = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  const openModal = useCallback(() => {
    const activeElement = document.activeElement
    if (
      activeElement instanceof HTMLElement &&
      inlineSurfaceRef.current?.contains(activeElement)
    ) {
      activeElement.blur()
    }
    setIsOpen(true)
  }, [setIsOpen])

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <LayoutGroup id={resolvedId}>
        <div
          ref={inlineSurfaceRef}
          className={cn(
            'mdeditor-media-asset group relative my-4 overflow-hidden rounded-xl border border-border/70 bg-muted/15 shadow-sm',
            className,
          )}
          onDoubleClick={openModal}
        >
          <motion.div
            layoutId={layoutId}
            transition={MEDIA_TRANSITION}
            className={cn('mdeditor-media-asset__content transform-gpu', contentClassName)}
          >
            {renderContent({ zoomed: false })}
          </motion.div>
          <MediaActionPanel inline expanded={false} onToggle={openModal} />
        </div>

        <AnimatePresence>
          {isOpen ? (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="fixed inset-0 z-[var(--z-modal)] bg-black/45 backdrop-blur-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={MEDIA_TRANSITION}
                />
              </Dialog.Overlay>
              <Dialog.Content
                forceMount
                asChild
                onOpenAutoFocus={(event) => {
                  event.preventDefault()
                  requestAnimationFrame(() => modalSurfaceRef.current?.focus())
                }}
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                <div
                  className="fixed inset-0 z-[calc(var(--z-modal)+1)] flex items-center justify-center p-[5vh] focus:outline-none"
                  style={{ pointerEvents: 'none' }}
                >
                  <motion.div
                    ref={modalSurfaceRef}
                    layoutId={layoutId}
                    transition={MEDIA_TRANSITION}
                    tabIndex={-1}
                    className={cn(
                      'mdeditor-media-modal relative flex max-h-[90vh] w-[min(90vw,96rem)] max-w-[90vw] items-center justify-center overflow-hidden rounded-2xl',
                      'border border-white/10 bg-background/90 shadow-2xl transform-gpu',
                      modalClassName,
                    )}
                    style={{ pointerEvents: 'auto' }}
                    onDoubleClick={close}
                  >
                    <Dialog.Title className="sr-only">{label}</Dialog.Title>
                    <Dialog.Description className="sr-only">
                      Expanded media preview. Double click, press Escape, or use the collapse button to close.
                    </Dialog.Description>
                    <MediaActionPanel expanded onToggle={close} />
                    <div
                      className={cn(
                        'mdeditor-media-modal__content flex max-h-[90vh] w-full items-center justify-center p-4',
                        contentClassName,
                      )}
                    >
                      {renderContent({ zoomed: true })}
                    </div>
                  </motion.div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          ) : null}
        </AnimatePresence>
      </LayoutGroup>
    </Dialog.Root>
  )
}
