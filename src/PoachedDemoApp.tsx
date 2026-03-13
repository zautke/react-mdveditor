import { TooltipProvider } from "@/components/ui/tooltip"
import { PoachedTabSystemDemo } from "@/components/ui/tabs/PoachedTabSystemDemo"

/**
 * Standalone demo app for testing the poached TabSystem component
 * To use: change the import in main.tsx to use this file
 */
export default function PoachedDemoApp() {
  return (
    <TooltipProvider>
      <PoachedTabSystemDemo />
    </TooltipProvider>
  )
}
