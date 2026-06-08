"use client"

import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { usePushNotifications } from "@/hooks/usePushNotifications"
import { Bell, X } from "lucide-react"

function PushPrompt() {
  const { permission, dismissPrompt } = usePushNotifications()

  if (permission !== "default") return null
  if (typeof window !== "undefined" && localStorage.getItem("push-dismissed")) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-lg border bg-background p-4 shadow-lg md:left-auto md:right-4 md:max-w-sm">
      <Bell className="h-5 w-5 shrink-0 text-primary" />
      <div className="flex-1 text-sm">
        <p className="font-medium">¿Querés recibir notificaciones?</p>
        <p className="text-muted-foreground">Te avisaremos sobre tareas, eventos y asignaciones.</p>
      </div>
      <button
        onClick={dismissPrompt}
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <ProtectedRoute>
        <DashboardLayout>{children}</DashboardLayout>
        <PushPrompt />
      </ProtectedRoute>
    </>
  )
}
