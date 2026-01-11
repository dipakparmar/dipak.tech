import { ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ModeToggle } from "@/components/mode-toggle"

export default function ToolsLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider delayDuration={0}>
        {/* Theme Toggle */}
        <div className="fixed right-4 top-4 z-50">
          <ModeToggle />
        </div>
        {children}
      </TooltipProvider>
    </ThemeProvider>
  )
}
