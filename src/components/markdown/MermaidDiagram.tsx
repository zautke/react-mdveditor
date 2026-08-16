import { useEffect, useId, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { MediaAssetFrame } from './media/MediaAssetFrame'

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
    const [error, setError] = useState<string | null>(null)
    const [svg, setSvg] = useState<string>('')
    const renderIdRef = useRef(0)
    const figureId = useId()
    const titleId = `${figureId}-title`
    const descId = `${figureId}-desc`

    // Extract diagram type from first line, skipping any YAML frontmatter
    const chartBody = (() => {
        const t = chart.trim()
        if (!t.startsWith('---')) return t
        const m = t.match(/^-{3}[^\S\r\n]*[\r\n][\s\S]*?[\r\n]-{3}[^\S\r\n]*[\r\n]+/)
        return m ? t.slice(m[0].length).trimStart() : t
    })()
    const diagramType = chartBody.split(/[\s\n]/)[0]
        ?.replace(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitgraph|journey|mindmap|timeline|sankey|xychart|quadrantChart|requirementDiagram|C4Context).*$/i, '$1') || 'Mermaid'
    const capitalizedType = diagramType.charAt(0).toUpperCase() + diagramType.slice(1)

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
        <MediaAssetFrame
            assetId={`mermaid-${figureId}`}
            label={`${capitalizedType} diagram`}
            sourceText={chart}
            renderContent={({ zoomed }) => (
                <figure
                    role="img"
                    aria-labelledby={titleId}
                    aria-describedby={descId}
                    className="w-full"
                >
                    <figcaption id={titleId} className="sr-only">
                        {capitalizedType} diagram
                    </figcaption>
                    <div id={descId} className="sr-only">
                        {chart}
                    </div>
                    <div
                        aria-hidden="true"
                        className={
                            zoomed
                                ? 'max-h-[calc(90vh-2rem)] overflow-auto p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full'
                                : 'overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full'
                        }
                        dangerouslySetInnerHTML={{ __html: svg }}
                    />
                </figure>
            )}
        />
    )
}

export default MermaidDiagram
