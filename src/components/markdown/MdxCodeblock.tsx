import React, { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { CopyButton, LineNumberButton } from '@braisenly/ui/code-block'

interface MdxCodeblockProps {
    codeContent: string
    language: string
}

export function ViteMDXDCodeBlock({ codeContent, language }: MdxCodeblockProps) {
    const [showLineNumbers, setShowLineNumbers] = useState(false)
    
    return (
        <div className="group relative my-4 overflow-hidden rounded-lg">
            <div className="absolute right-3 top-3 z-20 flex items-center justify-end space-x-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <CopyButton
                    onCopy={async () => {
                        await navigator.clipboard.writeText(codeContent)
                    }}
                />
                <LineNumberButton
                    showLineNumbers={showLineNumbers}
                    onToggle={() => setShowLineNumbers(prev => !prev)}
                />
            </div>
            <SyntaxHighlighter
                style={oneDark}
                language={language}
                PreTag="div"
                showLineNumbers={showLineNumbers}
                wrapLines={true}
                customStyle={{
                    margin: 0,
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.9rem'
                }}
            >
                {codeContent}
            </SyntaxHighlighter>
        </div>
    )
}
