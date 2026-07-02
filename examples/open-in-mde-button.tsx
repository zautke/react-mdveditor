import { useState } from 'react'

/**
 * Open in MDE — a self-contained button component.
 *
 * Open this file as a tab in MDE (it's a `.tsx` doctype) to see it render live
 * and iterate on the button. Type text, click "Open in MDE" → a new document
 * tab is created from that text.
 *
 * Portable: only imports `react`. It calls the optional `window.mdeCreateDoc`
 * bridge the editor exposes; if that isn't present (e.g. rendered in isolated
 * mode or outside MDE) it falls back to a status message so the component still
 * renders and the button still gives feedback.
 */
export default function OpenInMdeButton() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [hover, setHover] = useState(false)
  const [active, setActive] = useState(false)

  const disabled = text.trim().length === 0

  function handleOpen() {
    const value = text.trim()
    if (!value) return
    const bridge = (window as unknown as {
      mdeCreateDoc?: (t: string) => void
    }).mdeCreateDoc
    if (typeof bridge === 'function') {
      bridge(value)
      setStatus(`Opened a new tab (${value.length} chars)`)
      setText('')
    } else {
      setStatus(`Captured ${value.length} chars — open me inside MDE to create a tab`)
    }
    window.setTimeout(() => setStatus(null), 2400)
  }

  return (
    <div
      style={{
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        maxWidth: 560,
        margin: '2rem auto',
        padding: '1.5rem',
        borderRadius: 16,
        border: '1px solid rgba(0,0,0,0.08)',
        background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span
          aria-hidden
          style={{
            display: 'inline-flex',
            width: 26,
            height: 26,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #14b8a6, #0ea5e9)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          M
        </span>
        <strong style={{ fontSize: 15, color: '#0f172a' }}>Open in MDE</strong>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste or type text, then Open in MDE to create a new document…"
        rows={4}
        style={{
          width: '100%',
          resize: 'vertical',
          borderRadius: 10,
          border: '1px solid rgba(0,0,0,0.12)',
          padding: '0.6rem 0.7rem',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 13,
          lineHeight: 1.5,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <button
          type="button"
          onClick={handleOpen}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => { setHover(false); setActive(false) }}
          onMouseDown={() => setActive(true)}
          onMouseUp={() => setActive(false)}
          disabled={disabled}
          style={{
            appearance: 'none',
            border: 'none',
            borderRadius: 10,
            padding: '0.55rem 1.1rem',
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: disabled
              ? '#cbd5e1'
              : 'linear-gradient(135deg, #14b8a6, #0ea5e9)',
            boxShadow: disabled
              ? 'none'
              : hover
                ? '0 6px 18px rgba(14,165,233,0.38)'
                : '0 2px 8px rgba(14,165,233,0.28)',
            transform: active && !disabled ? 'translateY(1px) scale(0.99)' : 'none',
            transition: 'box-shadow 140ms ease, transform 90ms ease, background 140ms ease',
          }}
        >
          Open in MDE
        </button>
        {status && (
          <span style={{ fontSize: 13, color: '#475569' }}>{status}</span>
        )}
      </div>
    </div>
  )
}
