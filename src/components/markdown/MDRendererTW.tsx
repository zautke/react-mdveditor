import ReactMarkdown, { ExtraProps } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ClassAttributes } from 'react'
import { HTMLAttributes } from 'react'

interface MarkdownRendererProps {
    children: string
    className?: string
}

type CodeProps = ClassAttributes<HTMLElement> & HTMLAttributes<HTMLElement> & ExtraProps & {
    inline: boolean
}

function MarkdownRenderer({ children, className = '' }: MarkdownRendererProps) {
    return (
        <div className={`markdown-content mexican-menu-container ${className}`}>
            {/* Decorative corners using Tailwind utilities */}
            <div className="corner-orange" />
            <div className="corner-green" />

            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSlug]}
                components={{
                    code({ inline, className, children, ...props }: CodeProps) {
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
                            <code className={`bg-muted text-foreground border border-border/60 px-1 py-0.5 rounded text-sm ${className}`} {...props}>
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
                                className="text-brand-gradient text-responsive-title font-bold text-center my-8 pb-2 border-b-2 border-border font-['Inter'] animate-glow"
                                {...props}
                            >
                                {children}
                            </h1>
                        )
                    },
                    h2({ children, ...props }) {
                        return (
                            <h2
                                className="text-orange-gradient text-responsive-subtitle font-semibold text-center my-6 pb-2 border-b-4 border-mexican-orange"
                                {...props}
                            >
                                {children}
                            </h2>
                        )
                    },
                    h3({ children, ...props }) {
                        return (
                            <h3
                                className="text-mexican-green text-xl font-semibold my-6 border-l-4 border-mexican-green-light pl-4 bg-gradient-to-r from-mexican-green-light/15 to-transparent py-2 rounded"
                                {...props}
                            >
                                {children}
                            </h3>
                        )
                    },
                    h4({ children, ...props }) {
                        return (
                            <h4
                                className="text-mexican-orange text-lg font-semibold my-5 underline decoration-mexican-orange decoration-2 underline-offset-4"
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
                                className="text-mexican-brown font-semibold no-underline border-b-2 border-transparent transition-all duration-300 px-1 py-0.5 rounded hover:border-mexican-orange hover:bg-brand-accent/10 hover:-translate-y-0.5"
                                {...props}
                            >
                                {children}
                            </a>
                        )
                    },
                    hr({ ...props }) {
                        return (
                            <hr className="hr-mexican" {...props} />
                        )
                    },
                    strong({ children, ...props }) {
                        return (
                            <strong className="text-mexican-brown font-bold shadow-sm" {...props}>
                                {children}
                            </strong>
                        )
                    },
                    em({ children, ...props }) {
                        return (
                            <em className="text-mexican-green italic font-medium" {...props}>
                                {children}
                            </em>
                        )
                    },
                    ul({ children, ...props }) {
                        return (
                            <ul className="my-3 pl-8 list-disc marker:text-mexican-orange" {...props}>
                                {children}
                            </ul>
                        )
                    },
                    ol({ children, ...props }) {
                        return (
                            <ol className="my-3 pl-8 list-decimal marker:text-mexican-green marker:font-bold" {...props}>
                                {children}
                            </ol>
                        )
                    },
                    li({ children, ...props }) {
                        return (
                            <li className="my-1 leading-relaxed" {...props}>
                                {children}
                            </li>
                        )
                    },
                    p({ children, ...props }) {
                        return (
                            <p className="my-3 leading-relaxed text-justify" {...props}>
                                {children}
                            </p>
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
