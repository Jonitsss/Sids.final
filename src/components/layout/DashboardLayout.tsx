"use client"

import { useState, ReactNode, useEffect, useCallback } from "react"
import { Sidebar } from "./Sidebar"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useDashboardStore } from "@/stores/dashboardStore"

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, userData } = useAuth()

  const initMinisterios = useDashboardStore((s) => s.initMinisterios)
  const initRamas = useDashboardStore((s) => s.initRamas)
  const initUsuarios = useDashboardStore((s) => s.initUsuarios)
  const initNotificaciones = useDashboardStore((s) => s.initNotificaciones)
  const initConsultas = useDashboardStore((s) => s.initConsultas)
  const cleanup = useDashboardStore((s) => s.cleanup)
  const refreshAll = useDashboardStore((s) => s.refreshAll)

  useEffect(() => {
    if (!user?.uid || !userData?.rol) return
    initMinisterios()
    initRamas()
    initUsuarios()
    initNotificaciones(user.uid)
    initConsultas(user.uid, userData.rol)
    return () => cleanup()
  }, [user?.uid, userData?.rol, initMinisterios, initRamas, initUsuarios, initNotificaciones, initConsultas, cleanup])

  useEffect(() => {
    if (typeof window === "undefined") return
    let lastVisible = true
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        lastVisible = false
        return
      }
      if (document.visibilityState === "visible" && !lastVisible) {
        lastVisible = true
        if (user?.uid && userData?.rol) {
          refreshAll(user.uid, userData.rol)
        }
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => document.removeEventListener("visibilitychange", onVisibilityChange)
  }, [user?.uid, userData?.rol, refreshAll])

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-2 p-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
