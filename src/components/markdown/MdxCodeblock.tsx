import React, { useState } from 'react'
import { CodeBlock, PlaygroundActionPanel } from '@braisenly/ui/code-block'

interface MdxCodeblockProps {
    codeContent: string
    language: string
}

export function MdxCodeblock({ codeContent, language }: MdxCodeblockProps) {
    const [showLineNumbers, setShowLineNumbers] = useState(false)
    
    return (
        <div className="relative group my-4">
            <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <PlaygroundActionPanel
                    onReload={() => {}}
                    onCopyCode={async () => {
                        await navigator.clipboard.writeText(codeContent)
                    }}
                    onToggleLineNumbers={() => setShowLineNumbers(prev => !prev)}
                    showLineNumbers={showLineNumbers}
                    className="[&>button:first-child]:hidden border-none bg-transparent shadow-lg rounded-md"
                />
            </div>
            <CodeBlock code={codeContent} language={language} showLineNumbers={showLineNumbers} />
        </div>
    )
}
