import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import rehypeMathjax from 'rehype-mathjax'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import MermaidDiagram from './MermaidDiagram'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
    children: string
    className?: string
}

/**
 * MarkdownRenderer - Theme-aware markdown renderer
 *
 * Fully integrated with the design system:
 * - Uses CSS custom properties for all colors
 * - Supports smooth light/dark mode transitions
 * - No hardcoded colors or Mexican theme decorations
 * - Accessible contrast ratios (WCAG AA)
 */
function MarkdownRenderer({ children, className = '' }: MarkdownRendererProps) {
    const { resolvedTheme } = useTheme()
    const isDark = resolvedTheme === 'dark'

    return (
        <div
            className={cn(
                "markdown-content",
                "bg-card text-card-foreground",
                "rounded-lg border border-border",
                "p-6 md:p-8",
                "shadow-sm",
                className
            )}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeSlug, rehypeMathjax, rehypeRaw]}
                components={{
                    code({ inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        const codeContent = String(children).replace(/\n$/, '')

                        if (!inline && match && match[1] === 'mermaid') {
                            return <MermaidDiagram chart={codeContent} />
                        }

                        return !inline && match ? (
                            <SyntaxHighlighter
                                style={isDark ? oneDark : oneLight}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{
                                    borderRadius: 'var(--radius)',
                                    margin: '1rem 0',
                                }}
                                {...props}
                            >
                                {codeContent}
                            </SyntaxHighlighter>
                        ) : (
                            <code
                                className={cn(
                                    "px-1.5 py-0.5 rounded text-sm font-mono",
                                    "bg-muted text-foreground",
                                    className
                                )}
                                {...props}
                            >
                                {children}
                            </code>
                        )
                    },
                    table({ children, ...props }) {
                        return (
                            <div className="overflow-x-auto my-6 rounded-lg border border-border shadow-sm">
                                <table className="w-full border-collapse bg-card" {...props}>
                                    {children}
                                </table>
                            </div>
                        )
                    },
                    thead({ children, ...props }) {
                        return (
                            <thead className="bg-muted border-b border-border" {...props}>
                                {children}
                            </thead>
                        )
                    },
                    th({ children, ...props }) {
                        return (
                            <th
                                className="px-4 py-3 text-left font-semibold text-foreground border-b border-border"
                                {...props}
                            >
                                {children}
                            </th>
                        )
                    },
                    td({ children, ...props }) {
                        return (
                            <td
                                className="px-4 py-3 border-b border-border/50 transition-colors hover:bg-muted/50"
                                {...props}
                            >
                                {children}
                            </td>
                        )
                    },
                    blockquote({ children, ...props }) {
                        return (
                            <blockquote
                                className="my-6 pl-6 py-4 pr-4 border-l-4 border-brand-accent bg-muted/30 rounded-r-lg italic text-muted-foreground"
                                {...props}
                            >
                                {children}
                            </blockquote>
                        )
                    },
                    h1({ children, ...props }) {
                        return (
                            <h1
                                className="text-3xl md:text-4xl font-bold text-foreground my-8 pb-3 border-b-2 border-border"
                                {...props}
                            >
                                {children}
                            </h1>
                        )
                    },
                    h2({ children, ...props }) {
                        return (
                            <h2
                                className="text-2xl md:text-3xl font-semibold text-foreground my-6 pb-2 border-b border-border"
                                {...props}
                            >
                                {children}
                            </h2>
                        )
                    },
                    h3({ children, ...props }) {
                        return (
                            <h3 className="text-xl md:text-2xl font-semibold text-foreground my-5" {...props}>
                                {children}
                            </h3>
                        )
                    },
                    h4({ children, ...props }) {
                        return (
                            <h4 className="text-lg md:text-xl font-medium text-foreground my-4" {...props}>
                                {children}
                            </h4>
                        )
                    },
                    p({ children, ...props }) {
                        return (
                            <p className="my-4 leading-7 text-foreground" {...props}>
                                {children}
                            </p>
                        )
                    },
                    a({ children, href, ...props }) {
                        return (
                            <a
                                href={href}
                                className="font-medium text-brand-accent underline underline-offset-4 hover:text-brand-accent-light transition-colors"
                                {...props}
                            >
                                {children}
                            </a>
                        )
                    },
                    ul({ children, ...props }) {
                        return (
                            <ul className="my-4 ml-6 list-disc space-y-2 text-foreground" {...props}>
                                {children}
                            </ul>
                        )
                    },
                    ol({ children, ...props }) {
                        return (
                            <ol className="my-4 ml-6 list-decimal space-y-2 text-foreground" {...props}>
                                {children}
                            </ol>
                        )
                    },
                    li({ children, ...props }) {
                        return <li className="leading-7" {...props}>{children}</li>
                    },
                    hr({ ...props }) {
                        return <hr className="my-8 border-t-2 border-border" {...props} />
                    },
                    img({ src, alt, ...props }) {
                        return (
                            <img
                                src={src}
                                alt={alt}
                                className="my-4 rounded-lg max-w-full h-auto"
                                {...props}
                            />
                        )
                    },
                    input({ type, checked, ...props }) {
                        if (type === 'checkbox') {
                            return (
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    readOnly
                                    className="mr-2 h-4 w-4 rounded border-border accent-brand-accent"
                                    {...props}
                                />
                            )
                        }
                        return <input type={type} {...props} />
                    }
                }}
            >
                {children}
            </ReactMarkdown>
        </div>
    )
}

export default MarkdownRenderer
