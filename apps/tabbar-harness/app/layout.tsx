import type { Metadata } from "next"
import "@braisenly/ui/tab-system.css"
import "./globals.css"

export const metadata: Metadata = {
  title: "Tabbar Isolation Harness",
  description: "Local development harness for the reusable Braisenly tab system.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
