import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

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
            <div
                style={{
                    padding: '1rem',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fca5a5',
                    borderRadius: '4px',
                    color: '#dc2626',
                    margin: '1rem 0',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                }}
            >
                <strong>Mermaid Error:</strong> {error}
                <pre
                    style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: '#fef2f2',
                        borderRadius: '4px',
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                    }}
                >
                    {chart}
                </pre>
            </div>
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
