import { lazy, Suspense } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeMathjax from 'rehype-mathjax'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

// Lazy-load MermaidDiagram — the mermaid library is ~2.3 MB and only needed
// when a ```mermaid code fence is actually encountered.
const LazyMermaidDiagram = lazy(() => import('./MermaidDiagram'))

// ── Module-level components config ──────────────────────────────────
// Defined at module scope so ReactMarkdown receives the same object reference
// on every render.  This prevents the remark/rehype pipeline from being
// rebuilt on every keystroke (ReactMarkdown treats a new `components` object
// as a signal to re-initialize).

const markdownComponents: Components = {
    code({ className, children, node: _node, ...props }) {
        const match = /language-(\w+)/.exec(className || '')
        const codeContent = String(children).replace(/\n$/, '')

        // Handle mermaid diagrams — lazy-loaded with Suspense
        if (match && match[1] === 'mermaid') {
            return (
                <Suspense fallback={
                    <div style={{ padding: '1rem', color: '#888', fontStyle: 'italic' }}>
                        Loading diagram…
                    </div>
                }>
                    <LazyMermaidDiagram chart={codeContent} />
                </Suspense>
            )
        }

        return match ? (
            <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
            >
                {codeContent}
            </SyntaxHighlighter>
        ) : (
            <code className={className} {...props}>
                {children}
            </code>
        )
    },
    table({ children, ...props }) {
        return (
            <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
                <table
                    style={{
                        borderCollapse: 'collapse',
                        width: '100%',
                        border: '1px solid #e0e0e0'
                    }}
                    {...props}
                >
                    {children}
                </table>
            </div>
        )
    },
    th({ children, ...props }) {
        return (
            <th
                style={{
                    border: '1px solid #e0e0e0',
                    padding: '0.5rem',
                    backgroundColor: '#f5f5f5',
                    textAlign: 'left'
                }}
                {...props}
            >
                {children}
            </th>
        )
    },
    td({ children, ...props }) {
        return (
            <td
                style={{
                    border: '1px solid #e0e0e0',
                    padding: '0.5rem'
                }}
                {...props}
            >
                {children}
            </td>
        )
    },
    blockquote({ children, ...props }) {
        return (
            <blockquote
                style={{
                    borderLeft: '4px solid #007acc',
                    paddingLeft: '1rem',
                    margin: '1rem 0',
                    fontStyle: 'italic',
                    backgroundColor: '#f8f9fa'
                }}
                {...props}
            >
                {children}
            </blockquote>
        )
    },
    h1({ children, ...props }) {
        return (
            <h1
                style={{
                    borderBottom: '2px solid #e0e0e0',
                    paddingBottom: '0.3rem',
                    margin: '2rem 0 1rem 0'
                }}
                {...props}
            >
                {children}
            </h1>
        )
    },
    h2({ children, ...props }) {
        return (
            <h2
                style={{
                    borderBottom: '1px solid #e0e0e0',
                    paddingBottom: '0.2rem',
                    margin: '1.5rem 0 0.8rem 0'
                }}
                {...props}
            >
                {children}
            </h2>
        )
    },
    a({ children, href, ...props }) {
        return (
            <a
                href={href}
                style={{
                    color: '#007acc',
                    textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                {...props}
            >
                {children}
            </a>
        )
    }
}

// ── Plugin arrays — also module-level to avoid re-allocation ────────

const remarkPlugins = [remarkGfm, remarkMath]
const rehypePlugins = [rehypeSlug, rehypeMathjax, rehypeRaw]

// ── Component ───────────────────────────────────────────────────────

interface MarkdownRendererProps {
    children: string
    className?: string
}

function MarkdownRenderer({ children, className = '' }: MarkdownRendererProps) {
    return (
        <div className={`markdown-content ${className}`}>
            <ReactMarkdown
                remarkPlugins={remarkPlugins}
                rehypePlugins={rehypePlugins}
                components={markdownComponents}
            >
                {children}
            </ReactMarkdown>
        </div>
    )
}

export default MarkdownRenderer
