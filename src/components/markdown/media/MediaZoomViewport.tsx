import { type ReactNode } from 'react'
import { TransformComponent, TransformWrapper, useControls } from 'react-zoom-pan-pinch'
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MediaZoomViewportProps {
  className?: string
  contentClassName?: string
  children: ReactNode
}

function ViewportControlButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
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
      )}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}

function ViewportControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls()
  const glyphStyle = {
    width: 'var(--icon-button-glyph-size)',
    height: 'var(--icon-button-glyph-size)',
  }

  return (
    <div className="mdeditor-diagram-controls" onDoubleClick={(event) => event.stopPropagation()}>
      <ViewportControlButton label="Zoom in" onClick={() => zoomIn()}>
        <ZoomIn style={glyphStyle} />
      </ViewportControlButton>
      <ViewportControlButton label="Zoom out" onClick={() => zoomOut()}>
        <ZoomOut style={glyphStyle} />
      </ViewportControlButton>
      <ViewportControlButton label="Reset view" onClick={() => resetTransform()}>
        <Maximize style={glyphStyle} />
      </ViewportControlButton>
    </div>
  )
}

/**
 * Interactive pan/zoom surface for expanded media: mouse-wheel and pinch zoom,
 * drag to pan, plus lower-right zoom-in / zoom-out / reset controls.
 * Reusable — depends only on react-zoom-pan-pinch and shared icon-button styles.
 */
export function MediaZoomViewport({ className, contentClassName, children }: MediaZoomViewportProps) {
  return (
    <div
      className={cn('mdeditor-media-modal__viewport', className)}
      onDoubleClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <TransformWrapper
        minScale={0.2}
        maxScale={8}
        centerOnInit
        limitToBounds={false}
        doubleClick={{ disabled: true }}
        wheel={{ step: 0.2 }}
      >
        <ViewportControls />
        <TransformComponent
          wrapperClass="mdeditor-media-modal__viewport-inner"
          contentClass={cn('mdeditor-media-modal__svg-host', contentClassName)}
        >
          {children}
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
}
