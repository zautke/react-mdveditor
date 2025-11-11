import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownRendererProps {
    children: string
    className?: string
}

function MarkdownRenderer({ children, className = '' }: MarkdownRendererProps) {
    return (
        <div className={`markdown-content ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSlug]}
                components={{
                    code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                            <SyntaxHighlighter
                                style={oneDark}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                            >
                                {String(children).replace(/\n$/, '')}
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
                }}
            >
                {children}
            </ReactMarkdown>
        </div>
    )
}

export default MarkdownRenderer
