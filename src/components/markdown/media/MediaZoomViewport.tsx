import { type ReactNode, type WheelEvent as ReactWheelEvent, type MouseEvent as ReactMouseEvent } from 'react'
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformComponent,
  useTransformContext,
} from 'react-zoom-pan-pinch'
import { Maximize, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MediaZoomViewportProps {
  className?: string
  contentClassName?: string
  children: ReactNode
}

const MIN_SCALE = 0.01 // 1%
const MAX_SCALE = 50 // 5000%
/** Multiplicative factor per button click — curved + symmetric (÷ is the exact inverse of ×). */
const BUTTON_ZOOM_FACTOR = 1.25
/** Exponential wheel sensitivity: newScale = scale * exp(-deltaY * k). Symmetric by construction. */
const WHEEL_ZOOM_SENSITIVITY = 0.0015
/** Button/reset animation duration — short so deliberate repeat clicks settle and compound. */
const BUTTON_ANIMATION_MS = 140

const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))

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

/** Live zoom readout — subscribes to the transform state and re-renders every tick. */
function ZoomPercent() {
  return useTransformComponent(({ state }) => (
    <span className="mdeditor-diagram-controls__scale" aria-live="polite">
      {Math.round(state.scale * 100)}%
    </span>
  ))
}

function ViewportControls() {
  const ctx = useTransformContext()
  const { setTransform, resetTransform } = useControls()
  const glyphStyle = {
    width: 'var(--icon-button-glyph-size)',
    height: 'var(--icon-button-glyph-size)',
  }

  // Zoom about the viewport center by a fixed multiplicative factor.
  const zoomByFactor = (factor: number) => {
    const wrapper = ctx.wrapperComponent
    if (!wrapper) return
    const { scale, positionX, positionY } = ctx.state
    const newScale = clampScale(scale * factor)
    if (newScale === scale) return
    const focalX = wrapper.offsetWidth / 2
    const focalY = wrapper.offsetHeight / 2
    const ratio = newScale / scale
    setTransform(
      focalX - (focalX - positionX) * ratio,
      focalY - (focalY - positionY) * ratio,
      newScale,
      BUTTON_ANIMATION_MS,
      'easeOut',
    )
  }

  return (
    <div className="mdeditor-diagram-controls" onDoubleClick={(event) => event.stopPropagation()}>
      <ZoomPercent />
      <ViewportControlButton label="Zoom in" onClick={() => zoomByFactor(BUTTON_ZOOM_FACTOR)}>
        <ZoomIn style={glyphStyle} />
      </ViewportControlButton>
      <ViewportControlButton label="Zoom out" onClick={() => zoomByFactor(1 / BUTTON_ZOOM_FACTOR)}>
        <ZoomOut style={glyphStyle} />
      </ViewportControlButton>
      <ViewportControlButton label="Reset to 100%" onClick={() => resetTransform(BUTTON_ANIMATION_MS)}>
        <Maximize style={glyphStyle} />
      </ViewportControlButton>
    </div>
  )
}

/** Wheel-to-zoom (about cursor) + middle-click reset to 100%, wired to the same setTransform math. */
function ViewportGestures({ children }: { children: ReactNode }) {
  const ctx = useTransformContext()
  const { setTransform, resetTransform } = useControls()

  const zoomAtClientPoint = (clientX: number, clientY: number, factor: number, animationTime: number) => {
    const wrapper = ctx.wrapperComponent
    if (!wrapper) return
    const { scale, positionX, positionY } = ctx.state
    const newScale = clampScale(scale * factor)
    if (newScale === scale) return
    const rect = wrapper.getBoundingClientRect()
    const focalX = clientX - rect.left
    const focalY = clientY - rect.top
    const ratio = newScale / scale
    setTransform(
      focalX - (focalX - positionX) * ratio,
      focalY - (focalY - positionY) * ratio,
      newScale,
      animationTime,
      'easeOut',
    )
  }

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.stopPropagation()
    const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY)
    zoomAtClientPoint(event.clientX, event.clientY, factor, 0)
  }

  const onMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    // Middle mouse button (wheel click) → reset to the initial 100% view.
    if (event.button === 1) {
      event.preventDefault()
      resetTransform(BUTTON_ANIMATION_MS)
    }
  }

  return (
    <div className="mdeditor-media-modal__gestures" onWheel={onWheel} onMouseDown={onMouseDown}>
      {children}
    </div>
  )
}

/**
 * Interactive pan/zoom surface for expanded media. Exponential, symmetric zoom
 * (identical curved steps in and out) via mouse-wheel (about cursor) and the
 * lower-right controls; drag to pan; middle-click resets to 100%; a live zoom
 * percentage tracks the current scale. Reusable — depends only on
 * react-zoom-pan-pinch and shared icon-button styles.
 */
export function MediaZoomViewport({ className, contentClassName, children }: MediaZoomViewportProps) {
  return (
    <div
      className={cn('mdeditor-media-modal__viewport', className)}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <TransformWrapper
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        centerOnInit
        limitToBounds={false}
        doubleClick={{ disabled: true }}
        wheel={{ disabled: true }}
      >
        <ViewportControls />
        <ViewportGestures>
          <TransformComponent
            wrapperClass="mdeditor-media-modal__viewport-inner"
            contentClass={cn('mdeditor-media-modal__svg-host', contentClassName)}
            wrapperStyle={{ width: '100%', height: '100%', overflow: 'hidden' }}
          >
            {children}
          </TransformComponent>
        </ViewportGestures>
      </TransformWrapper>
    </div>
  )
}
