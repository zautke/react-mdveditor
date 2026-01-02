import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeMathjax from 'rehype-mathjax'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import MermaidDiagram from './MermaidDiagram'

interface MarkdownRendererProps {
    children: string
    className?: string
}

function MarkdownRenderer({ children, className = '' }: MarkdownRendererProps) {
    return (
        <div className={`markdown-content mexican-menu-container ${className}`}>
            <div className="corner-orange" />
            <div className="corner-green" />
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeSlug, rehypeMathjax, rehypeRaw]}
                components={{
                    code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        const codeContent = String(children).replace(/\n$/, '')

                        // Handle mermaid diagrams
                        if (!inline && match && match[1] === 'mermaid') {
                            return <MermaidDiagram chart={codeContent} />
                        }

                        return !inline && match ? (
                            <SyntaxHighlighter
                                style={oneDark}
                                language={match[1]}
                                PreTag="div"
                                {...props}
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
                            <div className="mexican-table-wrapper">
                                <table className="table-mexican" {...props}>
                                    {children}
                                </table>
                            </div>
                        )
                    },
                    th({ children, ...props }) {
                        return (
                            <th className="th-mexican" {...props}>
                                {children}
                            </th>
                        )
                    },
                    td({ children, ...props }) {
                        return (
                            <td className="td-mexican hover-lift" {...props}>
                                {children}
                            </td>
                        )
                    },
                    blockquote({ children, ...props }) {
                        return (
                            <blockquote className="blockquote-mexican" {...props}>
                                {children}
                            </blockquote>
                        )
                    },
                    h1({ children, ...props }) {
                        return (
                            <h1
                                className="text-brand-gradient text-responsive-title font-bold text-center my-8 pb-2 border-b-2 border-gray-300 animate-glow"
                                {...props}
                            >
                                {children}
                            </h1>
                        )
                    },
                    h2({ children, ...props }) {
                        return (
                            <h2
                                className="text-orange-gradient text-responsive-subtitle font-semibold text-center my-6 pb-2 border-b-4"
                                style={{ borderBottomColor: 'var(--mexican-orange)' }}
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
                                className="brand-brown font-semibold"
                                style={{ textDecoration: 'none' }}
                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                {...props}
                            >
                                {children}
                            </a>
                        )
                    }
                }}
            >
                {children}
            </ReactMarkdown>
        </div>
    )
}

export default MarkdownRenderer
