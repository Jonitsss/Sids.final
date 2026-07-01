"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn, rolLabel } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useDashboardStore } from "@/stores/dashboardStore"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  LayoutDashboard,
  Users,
  Calendar,
  Building2,
  ClipboardList,
  CheckSquare,
  BarChart3,
  UserCircle,
  LogOut,
  Sun,
  Moon,
  X,
  Bell,
  MessageSquare,
  Network,
  UserCheck,
  BookOpen,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { APP_VERSION } from "@/lib/version"
import { useTheme } from "@/contexts/ThemeContext"

interface SidebarProps {
  open: boolean
  onClose: () => void
}

type MenuItem = {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}

type MenuGroup = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href?: string
  children: MenuItem[]
}

const menuItems: Record<string, (MenuItem | MenuGroup)[]> = {
  pastor: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    {
      icon: Building2,
      label: "Ministerios",
      children: [
        { href: "/ministerios", icon: Building2, label: "Todos los Ministerios" },
        { href: "/celular", icon: Network, label: "Células" },
        { href: "/escuela-biblica", icon: BookOpen, label: "Escuela Bíblica" },
        { href: "/escuela-ministerios", icon: BookOpen, label: "Escuela Ministerios" },
      ],
    },
    { href: "/eventos", icon: Calendar, label: "Eventos" },
    { href: "/cronogramas", icon: ClipboardList, label: "Cronogramas" },
    { href: "/mis-asignaciones", icon: UserCheck, label: "Mis Asignaciones" },
    { href: "/personas", icon: Users, label: "Personas" },
    { href: "/miembros-iglesia", icon: Users, label: "Miembros Iglesia" },
    { href: "/tareas", icon: CheckSquare, label: "Tareas" },
    { href: "/consultas", icon: MessageSquare, label: "Consultas" },
    { href: "/asistencia", icon: Users, label: "Asistencia" },
    { href: "/notificaciones", icon: Bell, label: "Notificaciones" },
    { href: "/usuarios", icon: UserCircle, label: "Usuarios" },
    { href: "/reportes", icon: BarChart3, label: "Reportes" },
  ],
  administrador: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    {
      icon: Building2,
      label: "Ministerios",
      children: [
        { href: "/ministerios", icon: Building2, label: "Todos los Ministerios" },
        { href: "/celular", icon: Network, label: "Células" },
        { href: "/escuela-biblica", icon: BookOpen, label: "Escuela Bíblica" },
        { href: "/escuela-ministerios", icon: BookOpen, label: "Escuela Ministerios" },
      ],
    },
    { href: "/eventos", icon: Calendar, label: "Eventos" },
    { href: "/cronogramas", icon: ClipboardList, label: "Cronogramas" },
    { href: "/mis-asignaciones", icon: UserCheck, label: "Mis Asignaciones" },
    { href: "/personas", icon: Users, label: "Personas" },
    { href: "/miembros-iglesia", icon: Users, label: "Miembros Iglesia" },
    { href: "/tareas", icon: CheckSquare, label: "Tareas" },
    { href: "/consultas", icon: MessageSquare, label: "Consultas" },
    { href: "/asistencia", icon: Users, label: "Asistencia" },
    { href: "/notificaciones", icon: Bell, label: "Notificaciones" },
    { href: "/usuarios", icon: UserCircle, label: "Usuarios" },
    { href: "/reportes", icon: BarChart3, label: "Reportes" },
  ],
  lider: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    {
      icon: Building2,
      label: "Mi Ministerio",
      children: [
        { href: "/ministerios", icon: Building2, label: "Mi Ministerio" },
        { href: "/celular", icon: Network, label: "Células" },
        { href: "/escuela-ministerios", icon: BookOpen, label: "Escuela Ministerios" },
      ],
    },
    { href: "/eventos", icon: Calendar, label: "Eventos" },
    { href: "/cronogramas", icon: ClipboardList, label: "Cronogramas" },
    { href: "/mis-asignaciones", icon: UserCheck, label: "Mis Asignaciones" },
    { href: "/personas", icon: Users, label: "Personas" },
    { href: "/miembros-iglesia", icon: Users, label: "Miembros Iglesia" },
    { href: "/tareas", icon: CheckSquare, label: "Tareas" },
    { href: "/consultas", icon: MessageSquare, label: "Consultas" },
    { href: "/asistencia", icon: Users, label: "Asistencia" },
    { href: "/notificaciones", icon: Bell, label: "Notificaciones" },
  ],
  lider_area: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    {
      icon: Building2,
      label: "Mi Ministerio",
      children: [
        { href: "/ministerios", icon: Building2, label: "Mi Ministerio" },
        { href: "/celular", icon: Network, label: "Células" },
        { href: "/escuela-biblica", icon: BookOpen, label: "Escuela Bíblica" },
        { href: "/escuela-ministerios", icon: BookOpen, label: "Escuela Ministerios" },
      ],
    },
    { href: "/eventos", icon: Calendar, label: "Eventos" },
    { href: "/cronogramas", icon: ClipboardList, label: "Cronogramas" },
    { href: "/mis-asignaciones", icon: UserCheck, label: "Mis Asignaciones" },
    { href: "/personas", icon: Users, label: "Personas" },
    { href: "/miembros-iglesia", icon: Users, label: "Miembros Iglesia" },
    { href: "/tareas", icon: CheckSquare, label: "Tareas" },
    { href: "/consultas", icon: MessageSquare, label: "Consultas" },
    { href: "/asistencia", icon: Users, label: "Asistencia" },
    { href: "/notificaciones", icon: Bell, label: "Notificaciones" },
  ],
  lider_celula: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/ministerios", icon: Building2, label: "Mi Ministerio" },
    { href: "/ministerios/celulas", icon: Network, label: "Mi Célula" },
    { href: "/eventos", icon: Calendar, label: "Eventos" },
    { href: "/mis-asignaciones", icon: UserCheck, label: "Mis Asignaciones" },
    { href: "/notificaciones", icon: Bell, label: "Notificaciones" },
  ],
  colider: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/ministerios/celulas", icon: Network, label: "Mi Célula" },
    { href: "/eventos", icon: Calendar, label: "Eventos" },
    { href: "/mis-asignaciones", icon: UserCheck, label: "Mis Asignaciones" },
    { href: "/notificaciones", icon: Bell, label: "Notificaciones" },
  ],
  anfitrion: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/ministerios/celulas", icon: Network, label: "Mi Célula" },
    { href: "/eventos", icon: Calendar, label: "Eventos" },
    { href: "/mis-asignaciones", icon: UserCheck, label: "Mis Asignaciones" },
    { href: "/notificaciones", icon: Bell, label: "Notificaciones" },
  ],
  colaborador: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/mis-asignaciones", icon: UserCheck, label: "Mis Asignaciones" },
    { href: "/tareas", icon: CheckSquare, label: "Mis Tareas" },
    { href: "/eventos", icon: Calendar, label: "Eventos" },
    { href: "/consultas", icon: MessageSquare, label: "Consultas" },
    { href: "/notificaciones", icon: Bell, label: "Notificaciones" },
  ],
}

function isGroup(item: MenuItem | MenuGroup): item is MenuGroup {
  return "children" in item
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, userData, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const role = userData?.rol || "colaborador"
  const { noLeidas, consultasNoLeidas, ministerios } = useDashboardStore()
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Ministerios: true,
    "Mi Ministerio": true,
  })

  const baseItems = menuItems[role] || menuItems.colaborador
  const items = (() => {
    if (role === "lider" || role === "lider_area") {
      const ministerioCelular = ministerios.find((m) => m.nombre === "Celular")
      const esLiderCelular = ministerioCelular && userData?.ministerioIds?.includes(ministerioCelular.id)
      if (!esLiderCelular) {
        return baseItems.map((item) => {
          if (isGroup(item) && item.label === "Mi Ministerio") {
            return { ...item, children: item.children.filter((c) => c.href !== "/celular") }
          }
          return item
        })
      }
    }
    return baseItems
  })()

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 border-r bg-card/90 backdrop-blur-xl transition-transform duration-200 flex flex-col",
          open ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="font-bold text-lg text-foreground hover:text-primary transition-colors">
              SIDS
            </Link>
            <span className="text-xs text-muted-foreground">v{APP_VERSION}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-1.5 py-1 space-y-0.5">
          {items.map((item) => {
            if (isGroup(item)) {
              const isExpanded = expandedGroups[item.label] ?? false
              const hasActiveChild = item.children.some((child) => isActive(child.href))
              return (
                <div key={item.label} className="space-y-0.5">
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      hasActiveChild
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-4 pl-3 border-l border-border space-y-0.5">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            isActive(child.href)
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <child.icon className="h-4 w-4" />
                          <span className="flex-1">{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.href === "/notificaciones" && noLeidas > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {noLeidas > 99 ? "99+" : noLeidas}
                  </span>
                )}
                {item.href === "/consultas" && consultasNoLeidas > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {consultasNoLeidas > 99 ? "99+" : consultasNoLeidas}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t p-2 space-y-1 shrink-0">
          <Link href="/perfil" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            <Avatar className="h-7 w-7">
              <AvatarImage src={userData?.fotoURL} alt="Foto" className="object-cover" />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {userData?.nombre?.[0]}{userData?.apellido?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{userData?.nombre} {userData?.apellido}</p>
              <p className="text-xs">{rolLabel(userData?.rol)}</p>
            </div>
          </Link>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="flex-1">
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={logout} className="flex-1 text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
