"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useDashboard } from "@/hooks/useDashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DashboardSkeleton } from "@/components/skeletons"
import { Calendar, CheckSquare, Users, AlertCircle, Building2, Clock, User } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

const iconos: Record<string, any> = { Building2, Calendar }

const tipoLabel: Record<string, string> = {
  reunion_general: "Reunión General",
  ensayo: "Ensayo",
  jovenes: "Jóvenes",
  escuela_biblica: "Esc. Bíblica",
  evento_especial: "Especial",
}

const estadoColor: Record<string, string> = {
  pendiente: "secondary",
  en_progreso: "warning",
  completada: "success",
}

const estadoLabel: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completada: "Completada",
}

export default function DashboardPage() {
  const { userData } = useAuth()
  const { data, loading } = useDashboard()

  if (loading) return <DashboardSkeleton />

  const { stats, proximosEventos, tareasRecientes, estadoMinisterios } = data!

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenido, {userData?.nombre} {userData?.apellido}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Próximas Reuniones</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.proximasReuniones}</div>
            <p className="text-xs text-muted-foreground">
              {stats.proximasReuniones === 1 ? "1 evento próximo" : `${stats.proximasReuniones} eventos próximos`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tareas Pendientes</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tareasPendientes}</div>
            <p className="text-xs text-muted-foreground">
              {stats.tareasPendientes === 0
                ? "Sin tareas pendientes"
                : `${stats.tareasPendientes} tarea${stats.tareasPendientes > 1 ? "s" : ""} sin completar`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.colaboradores}</div>
            <p className="text-xs text-muted-foreground">
              {stats.colaboradores === 1 ? "1 colaborador activo" : `${stats.colaboradores} colaboradores activos`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Asignaciones</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmacionesPendientes}</div>
            <p className="text-xs text-muted-foreground">Sin asignaciones pendientes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximosEventos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No hay eventos próximos</p>
                <p className="text-sm">Creá eventos desde la sección Eventos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {proximosEventos.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-3 p-2 rounded-lg">
                    <div className="flex flex-col items-center justify-center h-10 w-10 rounded-md bg-primary/10 text-primary text-xs font-bold leading-tight shrink-0">
                      <span>{format(ev.fecha, "d")}</span>
                      <span>{format(ev.fecha, "MMM", { locale: es })}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.titulo}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{ev.horaInicio}</span>
                        <Badge variant="outline" className="text-xs font-normal">{tipoLabel[ev.tipo] || ev.tipo}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Tareas Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tareasRecientes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No hay tareas pendientes</p>
                <p className="text-sm">Creá tareas desde la sección Tareas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tareasRecientes.map((t) => (
                  <Link key={t.id} href={`/tareas`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{t.titulo}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Vence: {format(new Date(t.fechaLimite), "d MMM", { locale: es })}</span>
                      </div>
                    </div>
                    <Badge variant={estadoColor[t.estado] as any} className="text-xs shrink-0">
                      {estadoLabel[t.estado]}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Estado General de Ministerios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {estadoMinisterios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No hay ministerios configurados</p>
                <p className="text-sm">Creá ministerios desde la sección Ministerios</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {estadoMinisterios.map(({ ministerio: m, miembros }) => {
                  const Icon = iconos[m.icono] || Building2
                  return (
                    <Link key={m.id} href={`/ministerios/${m.slug}`} className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors group">
                      <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: m.color + "20" }}>
                        <Icon className="h-5 w-5" style={{ color: m.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{m.nombre}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {miembros} {miembros === 1 ? "miembro" : "miembros"} · {m.roles?.length || 0} roles
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
