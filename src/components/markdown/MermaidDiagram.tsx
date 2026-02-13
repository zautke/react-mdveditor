import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

interface MermaidDiagramProps {
    chart: string
}

// Initialize mermaid with default settings
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'system-ui, -apple-system, sans-serif',
})

function MermaidDiagram({ chart }: MermaidDiagramProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [error, setError] = useState<string | null>(null)
    const [svg, setSvg] = useState<string>('')
    const renderIdRef = useRef(0)

    useEffect(() => {
        let cancelled = false

        const renderDiagram = async () => {
            if (!chart.trim()) {
                setError('Empty diagram')
                setSvg('')
                return
            }

            setError(null)

            try {
                await mermaid.parse(chart)
                const id = `mermaid-${renderIdRef.current++}-${Date.now()}`
                const { svg: renderedSvg } = await mermaid.render(id, chart)
                if (!cancelled) setSvg(renderedSvg)
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Failed to render diagram')
                    setSvg('')
                }
            }
        }

        renderDiagram()
        return () => { cancelled = true }
    }, [chart])

    if (error) {
        return (
            <Alert variant="destructive" className="my-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Mermaid Error</AlertTitle>
                <AlertDescription>
                    <p className="mb-2">{error}</p>
                    <pre className="mt-2 rounded-sm bg-destructive/10 p-2 font-mono text-xs overflow-auto whitespace-pre-wrap">
                        {chart}
                    </pre>
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <div
            ref={containerRef}
            className="my-4 rounded-lg border p-4 overflow-auto"
            style={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08)',
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    )
}

export default MermaidDiagram
