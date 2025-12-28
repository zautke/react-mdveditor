import * as React from "react"
import { useRef, useCallback, memo, type ChangeEvent } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface FileUploadButtonProps {
  onFileContent: (content: string) => void
  accept?: string
  tooltipText?: string
}

const FileUploadButton = memo(({
  onFileContent,
  accept = ".md,.mdx",
  tooltipText = "Upload MD file"
}: FileUploadButtonProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        onFileContent(content)
      }
    }
    reader.readAsText(file)

    // Reset input so the same file can be uploaded again
    e.target.value = ""
  }, [onFileContent])

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={handleClick}
            className="ml-2 h-7 w-7"
            aria-label={tooltipText}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </>
  )
})
FileUploadButton.displayName = "FileUploadButton"

export { FileUploadButton }
