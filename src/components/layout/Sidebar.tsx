"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useNotificaciones } from "@/hooks/useNotificaciones"
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
} from "lucide-react"
import { useTheme } from "@/contexts/ThemeContext"

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const menuItems = {
  pastor: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/ministerios", icon: Building2, label: "Ministerios" },
    { href: "/eventos", icon: Calendar, label: "Eventos" },
    { href: "/cronogramas", icon: ClipboardList, label: "Cronogramas" },
    { href: "/tareas", icon: CheckSquare, label: "Tareas" },
    { href: "/asistencia", icon: Users, label: "Asistencia" },
    { href: "/notificaciones", icon: Bell, label: "Notificaciones" },
    { href: "/usuarios", icon: UserCircle, label: "Usuarios" },
    { href: "/reportes", icon: BarChart3, label: "Reportes" },
  ],
  lider: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/ministerios", icon: Building2, label: "Mi Ministerio" },
    { href: "/eventos", icon: Calendar, label: "Eventos" },
    { href: "/cronogramas", icon: ClipboardList, label: "Cronogramas" },
    { href: "/tareas", icon: CheckSquare, label: "Tareas" },
    { href: "/asistencia", icon: Users, label: "Asistencia" },
    { href: "/notificaciones", icon: Bell, label: "Notificaciones" },
  ],
  colaborador: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/cronogramas", icon: ClipboardList, label: "Mis Asignaciones" },
    { href: "/tareas", icon: CheckSquare, label: "Mis Tareas" },
    { href: "/eventos", icon: Calendar, label: "Eventos" },
    { href: "/notificaciones", icon: Bell, label: "Notificaciones" },
  ],
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, userData, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const role = userData?.rol || "colaborador"
  const items = menuItems[role] || menuItems.colaborador
  const { noLeidas } = useNotificaciones(userData?.id || user?.uid)

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
          <Link href="/dashboard" className="font-bold text-lg text-foreground hover:text-primary transition-colors">
            SIDS
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === item.href || pathname.startsWith(item.href + "/")
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
            </Link>
          ))}
        </nav>

        <div className="border-t p-3 space-y-2 shrink-0">
          <Link href="/perfil" onClick={onClose} className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            <Avatar className="h-7 w-7">
              <AvatarImage src={userData?.fotoURL} alt="Foto" className="object-cover" />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {userData?.nombre?.[0]}{userData?.apellido?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{userData?.nombre} {userData?.apellido}</p>
              <p className="text-xs capitalize">{userData?.rol}</p>
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
