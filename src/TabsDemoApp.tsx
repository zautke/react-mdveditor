import { TooltipProvider } from "@/components/ui/tooltip"
import { TabSystemDemo } from "@/components/ui/tabs/TabSystemDemo"

/**
 * Standalone demo app for testing the TabSystem component
 * To use: change the import in main.tsx to use this file
 */
export default function TabsDemoApp() {
  return (
    <TooltipProvider>
      <TabSystemDemo />
    </TooltipProvider>
  )
}
