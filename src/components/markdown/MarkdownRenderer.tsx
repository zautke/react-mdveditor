import ReactMarkdown, { ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ClassAttributes, CSSProperties } from 'react'
import { HTMLAttributes } from 'react'
import type { MarkdownRendererProps, CodeProps } from '../../index.d.ts'

function MarkdownRenderer({ children, className = '' }: MarkdownRendererProps) {
    return (
        <div
            className={`markdown-content ${className}`}
            style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '3rem',
                boxShadow: '0 25px 80px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(10px)',
                background: 'linear-gradient(135deg, #fff8f0 0%, #ffffff 50%, #f0fff8 100%)',
                border: '2px solid #d4af37',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Decorative corners */}
            <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                width: '60px',
                height: '60px',
                background: 'linear-gradient(45deg, #ff6b35, #d2691e)',
                clipPath: 'polygon(0 0, 100% 0, 0 100%)'
            }} />
            <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #228b22, #32cd32)',
                clipPath: 'polygon(100% 0, 100% 100%, 0 0)'
            }} />
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSlug]}
                components={{
                    code({ node, inline, className, children, ...props }: CodeProps) {
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
                            <div style={{ overflowX: 'auto', margin: '2rem 0', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                                <table
                                    style={{
                                        borderCollapse: 'collapse',
                                        width: '100%',
                                        border: '3px solid #d2691e',
                                        background: 'linear-gradient(135deg, #fff8dc 0%, #ffffff 100%)',
                                        borderRadius: '15px',
                                        overflow: 'hidden'
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
                                    border: '2px solid #d2691e',
                                    padding: '1rem',
                                    background: 'linear-gradient(135deg, #ff6b35 0%, #d2691e 100%)',
                                    color: 'white',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '1.1em',
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
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
                                    border: '1px solid #deb887',
                                    padding: '1rem',
                                    textAlign: 'center',
                                    background: 'rgba(255, 248, 220, 0.5)',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 215, 0, 0.2)'
                                    e.currentTarget.style.transform = 'scale(1.02)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 248, 220, 0.5)'
                                    e.currentTarget.style.transform = 'scale(1)'
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
                                    borderLeft: '6px solid #ff6b35',
                                    paddingLeft: '2rem',
                                    margin: '2rem 0',
                                    fontStyle: 'italic',
                                    background: 'linear-gradient(135deg, #fff8f0 0%, #ffeee6 100%)',
                                    padding: '1.5rem 2rem',
                                    borderRadius: '10px',
                                    boxShadow: '0 8px 25px rgba(255, 107, 53, 0.15)',
                                    fontSize: '1.1em',
                                    lineHeight: '1.6',
                                    position: 'relative'
                                }}
                                {...props}
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    left: '10px',
                                    fontSize: '3em',
                                    color: '#ff6b35',
                                    opacity: 0.3,
                                    fontFamily: 'serif'
                                }}>
                                    "
                                </div>
                                {children}
                            </blockquote>
                        )
                    },
                    h1({ children, ...props }) {
                        return (
                            <h1
                                style={{
                                    background: 'linear-gradient(135deg, #ff6b35 0%, #d2691e 50%, #228b22 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    fontSize: '2.5em',
                                    fontWeight: 'bold',
                                    textAlign: 'center',
                                    margin: '2rem 0 1rem 0',
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                                    fontFamily: '"Inter", serif'
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
                                    color: '#d2691e',
                                    borderBottom: '3px solid #ff6b35',
                                    paddingBottom: '0.5rem',
                                    margin: '2rem 0 1rem 0',
                                    fontSize: '1.8em',
                                    fontWeight: '600',
                                    textAlign: 'center',
                                    background: 'linear-gradient(135deg, #d2691e 0%, #ff6b35 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                }}
                                {...props}
                            >
                                {children}
                            </h2>
                        )
                    },
                    h3({ children, ...props }) {
                        return (
                            <h3
                                style={{
                                    color: '#228b22',
                                    margin: '1.5rem 0 0.8rem 0',
                                    fontSize: '1.4em',
                                    fontWeight: '600',
                                    borderLeft: '4px solid #32cd32',
                                    paddingLeft: '1rem',
                                    background: 'linear-gradient(90deg, rgba(50, 205, 50, 0.1) 0%, transparent 100%)',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '5px'
                                }}
                                {...props}
                            >
                                {children}
                            </h3>
                        )
                    },
                    h4({ children, ...props }) {
                        return (
                            <h4
                                style={{
                                    color: '#ff6b35',
                                    margin: '1.2rem 0 0.6rem 0',
                                    fontSize: '1.2em',
                                    fontWeight: '600',
                                    textDecoration: 'underline',
                                    textDecorationColor: '#ff6b35',
                                    textDecorationThickness: '2px',
                                    textUnderlineOffset: '4px'
                                }}
                                {...props}
                            >
                                {children}
                            </h4>
                        )
                    },
                    a({ children, href, ...props }) {
                        return (
                            <a
                                href={href}
                                style={{
                                    color: '#d2691e',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    borderBottom: '2px solid transparent',
                                    transition: 'all 0.3s ease',
                                    padding: '2px 4px',
                                    borderRadius: '4px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderBottom = '2px solid #ff6b35'
                                    e.currentTarget.style.background = 'rgba(255, 107, 53, 0.1)'
                                    e.currentTarget.style.transform = 'translateY(-1px)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderBottom = '2px solid transparent'
                                    e.currentTarget.style.background = 'transparent'
                                    e.currentTarget.style.transform = 'translateY(0)'
                                }}
                                {...props}
                            >
                                {children}
                            </a>
                        )
                    },
                    hr({ ...props }) {
                        return (
                            <hr
                                style={{
                                    border: 'none',
                                    height: '4px',
                                    background: 'linear-gradient(90deg, #ff6b35 0%, #d2691e 50%, #228b22 100%)',
                                    margin: '3rem 0',
                                    borderRadius: '2px',
                                    boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)'
                                }}
                                {...props}
                            />
                        )
                    },
                    strong({ children, ...props }) {
                        return (
                            <strong
                                style={{
                                    color: '#d2691e',
                                    fontWeight: '700',
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                                }}
                                {...props}
                            >
                                {children}
                            </strong>
                        )
                    },
                    em({ children, ...props }) {
                        return (
                            <em
                                style={{
                                    color: '#228b22',
                                    fontStyle: 'italic',
                                    fontWeight: '500'
                                }}
                                {...props}
                            >
                                {children}
                            </em>
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
