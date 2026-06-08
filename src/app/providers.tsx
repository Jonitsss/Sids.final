"use client"

import { ReactNode } from "react"
import { AuthProvider } from "@/contexts/AuthContext"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { Toaster } from "sonner"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <Toaster
          position="top-right"
          closeButton
          theme="system"
          toastOptions={{
            duration: 2500,
            style: {
              borderRadius: "var(--radius-lg)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            },
            classNames: {
              toast: "!bg-card/95 !backdrop-blur-xl !border !shadow-lg !text-foreground",
              title: "text-sm font-medium !text-foreground",
              description: "text-xs !text-muted-foreground",
              icon: "!shrink-0",
              success: "!border-emerald-500/30",
              error: "!border-red-500/30",
              warning: "!border-amber-500/30",
              info: "!border-blue-500/30",
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  )
}
