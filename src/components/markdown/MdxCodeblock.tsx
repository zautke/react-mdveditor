import React, { useEffect, useRef, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { CopyButton, LineNumberButton } from '@braisenly/ui/code-block'

interface MdxCodeblockProps {
    codeContent: string
    language: string
}

const LINE_NUMBER_TRANSITION = [
    'width var(--duration-base) var(--ease-in-out)',
    'min-width var(--duration-base) var(--ease-in-out)',
    'padding-right var(--duration-base) var(--ease-in-out)',
    'opacity var(--duration-fast) var(--ease-in-out)',
].join(', ')
const LINE_NUMBER_EXIT_MS = 250

function getLineNumberStyle(showLineNumbers: boolean) {
    return {
        display: 'inline-flex',
        justifyContent: 'flex-end',
        alignItems: 'baseline',
        width: showLineNumbers ? '3ch' : '0',
        minWidth: showLineNumbers ? '3ch' : '0',
        paddingRight: showLineNumbers ? '0.75rem' : '0',
        marginRight: 0,
        overflow: 'hidden',
        opacity: showLineNumbers ? 1 : 0,
        textAlign: 'right' as const,
        userSelect: 'none' as const,
        color: 'rgb(92 99 112)',
        fontStyle: 'normal',
        transition: LINE_NUMBER_TRANSITION,
    }
}

export function ViteMDXDCodeBlock({ codeContent, language }: MdxCodeblockProps) {
    const [showLineNumbers, setShowLineNumbers] = useState(false)
    const [renderLineNumbers, setRenderLineNumbers] = useState(false)
    const hideLineNumbersTimeoutRef = useRef<number | null>(null)

    useEffect(() => {
        return () => {
            if (hideLineNumbersTimeoutRef.current !== null) {
                window.clearTimeout(hideLineNumbersTimeoutRef.current)
            }
        }
    }, [])

    const toggleLineNumbers = () => {
        if (hideLineNumbersTimeoutRef.current !== null) {
            window.clearTimeout(hideLineNumbersTimeoutRef.current)
            hideLineNumbersTimeoutRef.current = null
        }

        if (showLineNumbers) {
            setShowLineNumbers(false)
            hideLineNumbersTimeoutRef.current = window.setTimeout(() => {
                setRenderLineNumbers(false)
                hideLineNumbersTimeoutRef.current = null
            }, LINE_NUMBER_EXIT_MS)
            return
        }

        setRenderLineNumbers(true)
        window.requestAnimationFrame(() => {
            setShowLineNumbers(true)
        })
    }
    
    return (
        <div className="mdeditor-code-block group relative my-4 overflow-hidden rounded-lg">
            <div className="absolute right-3 top-3 z-20 flex items-center justify-end gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <CopyButton
                    onCopy={async () => {
                        await navigator.clipboard.writeText(codeContent)
                    }}
                />
                <LineNumberButton
                    showLineNumbers={showLineNumbers}
                    onToggle={toggleLineNumbers}
                />
            </div>
            <SyntaxHighlighter
                style={oneDark}
                language={language}
                PreTag="pre"
                className="mdeditor-code-block__surface"
                codeTagProps={{ className: 'mdeditor-code-block__code' }}
                showLineNumbers={renderLineNumbers}
                showInlineLineNumbers={renderLineNumbers}
                wrapLines={true}
                lineProps={() => ({ className: 'mdeditor-code-block__line' })}
                lineNumberStyle={() => getLineNumberStyle(showLineNumbers)}
                customStyle={{
                    margin: 0,
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                }}
            >
                {codeContent}
            </SyntaxHighlighter>
        </div>
    )
}
