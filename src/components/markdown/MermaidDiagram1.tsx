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

let diagramCounter = 0

function MermaidDiagram({ chart }: MermaidDiagramProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [error, setError] = useState<string | null>(null)
    const [svg, setSvg] = useState<string>('')
    const idRef = useRef<string>(`mermaid-${diagramCounter++}`)

    useEffect(() => {
        const renderDiagram = async () => {
            if (!chart.trim()) {
                setError('Empty diagram')
                return
            }

            try {
                // Validate the diagram first
                const isValid = await mermaid.parse(chart)
                if (!isValid) {
                    setError('Invalid mermaid syntax')
                    return
                }

                // Render the diagram
                const { svg: renderedSvg } = await mermaid.render(idRef.current, chart)
                setSvg(renderedSvg)
                setError(null)
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram'
                setError(errorMessage)
                setSvg('')
            }
        }

        renderDiagram()
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
            style={{
                margin: '1rem 0',
                padding: '1rem',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                overflow: 'auto',
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    )
}

export default MermaidDiagram
