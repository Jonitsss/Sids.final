"use client"

import { useReportes } from "@/hooks/useReportes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ReportesSkeleton } from "@/components/skeletons"
import { BarChart3, TrendingUp, Users, Calendar, User, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

export default function ReportesPage() {
  const { data, loading } = useReportes()

  if (loading) return <ReportesSkeleton />

  if (!data) return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">Estadísticas y análisis de asistencia</p>
      </div>
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Error al cargar los datos</p>
        </CardContent>
      </Card>
    </div>
  )

  const { stats, asistenciaMensual, porMinisterio, ranking } = data
  const maxAsistencia = Math.max(...asistenciaMensual.map((m) => m.presente + m.ausente + m.justificado), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-muted-foreground">Estadísticas y análisis de asistencia</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Asistencia Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.asistenciaPromedio}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.asistenciaPromedio === 0
                ? "Sin datos suficientes"
                : stats.asistenciaPromedio >= 80
                  ? "Excelente participación"
                  : stats.asistenciaPromedio >= 60
                    ? "Buena participación"
                    : "Baja participación"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalColaboradores}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalColaboradores === 1 ? "1 colaborador activo" : `${stats.totalColaboradores} colaboradores activos`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Eventos del Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.eventosDelMes}</div>
            <p className="text-xs text-muted-foreground">
              {stats.eventosDelMes === 0
                ? "Sin eventos este mes"
                : stats.eventosDelMes === 1
                  ? "1 evento este mes"
                  : `${stats.eventosDelMes} eventos este mes`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Baja Asistencia</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bajaAsistencia}</div>
            <p className="text-xs text-muted-foreground">
              {stats.bajaAsistencia === 0
                ? "Sin casos de baja asistencia"
                : `${stats.bajaAsistencia} colaborador${stats.bajaAsistencia > 1 ? "es" : ""} con <50% de asistencia`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="asistencia">
        <TabsList>
          <TabsTrigger value="asistencia">Asistencia Mensual</TabsTrigger>
          <TabsTrigger value="ministerio">Por Ministerio</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
        </TabsList>

        <TabsContent value="asistencia">
          <Card>
            <CardHeader>
              <CardTitle>Asistencia Mensual</CardTitle>
            </CardHeader>
            <CardContent>
              {asistenciaMensual.every((m) => m.presente === 0 && m.ausente === 0 && m.justificado === 0) ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No hay datos de asistencia disponibles</p>
                  <p className="text-sm">Los reportes se generarán cuando se registre asistencia</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {asistenciaMensual.map((m) => {
                    const total = m.presente + m.ausente + m.justificado
                    const pctPresente = (m.presente / maxAsistencia) * 100
                    const pctAusente = (m.ausente / maxAsistencia) * 100
                    const pctJustificado = (m.justificado / maxAsistencia) * 100
                    return (
                      <div key={m.mes}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{m.mes}</span>
                          <span className="text-sm text-muted-foreground">{total} registros</span>
                        </div>
                        <div className="flex h-6 rounded-full overflow-hidden bg-muted">
                          {m.presente > 0 && (
                            <div
                              className="bg-emerald-500 transition-all"
                              style={{ width: `${pctPresente}%` }}
                              title={`Presente: ${m.presente}`}
                            />
                          )}
                          {m.ausente > 0 && (
                            <div
                              className="bg-red-400 transition-all"
                              style={{ width: `${pctAusente}%` }}
                              title={`Ausente: ${m.ausente}`}
                            />
                          )}
                          {m.justificado > 0 && (
                            <div
                              className="bg-amber-400 transition-all"
                              style={{ width: `${pctJustificado}%` }}
                              title={`Justificado: ${m.justificado}`}
                            />
                          )}
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-emerald-500" />
                            {m.presente}
                          </span>
                          <span className="flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-400" />
                            {m.ausente}
                          </span>
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-400" />
                            {m.justificado}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ministerio">
          <Card>
            <CardHeader>
              <CardTitle>Asistencia por Ministerio</CardTitle>
            </CardHeader>
            <CardContent>
              {porMinisterio.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No hay ministerios configurados</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {porMinisterio.map((m) => {
                    const maxTotal = Math.max(...porMinisterio.map((pm) => pm.total), 1)
                    const barWidth = (m.total / maxTotal) * 100
                    return (
                      <div key={m.ministerioId}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: m.ministerioColor }} />
                            <span className="text-sm font-medium">{m.ministerioNombre}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><User className="h-3 w-3" />{m.miembros}</span>
                            {m.total > 0 && (
                              <>
                                <span className="flex items-center gap-1 text-emerald-500">
                                  <CheckCircle className="h-3 w-3" />{m.presente}
                                </span>
                                <span className="flex items-center gap-1 text-red-400">
                                  <XCircle className="h-3 w-3" />{m.ausente}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex h-5 rounded-full overflow-hidden bg-muted">
                          {m.presente > 0 && (
                            <div
                              className="bg-emerald-500 transition-all"
                              style={{ width: `${(m.presente / maxTotal) * 100}%` }}
                            />
                          )}
                          {m.ausente > 0 && (
                            <div
                              className="bg-red-400 transition-all"
                              style={{ width: `${(m.ausente / maxTotal) * 100}%` }}
                            />
                          )}
                        </div>
                        {m.total === 0 && (
                          <p className="text-xs text-muted-foreground mt-1">Sin registros este mes</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ranking">
          <Card>
            <CardHeader>
              <CardTitle>Ranking de Participación</CardTitle>
            </CardHeader>
            <CardContent>
              {ranking.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>No hay datos de asistencia para generar ranking</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {ranking.map((u, idx) => (
                    <div key={u.usuarioId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                      <span className="w-6 text-center text-sm font-bold text-muted-foreground">#{idx + 1}</span>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {u.nombre[0]}{u.apellido[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.nombre} {u.apellido}</p>
                        <p className="text-xs text-muted-foreground">{u.presente}/{u.total} asistencias</p>
                      </div>
                      <Badge variant={u.porcentaje >= 80 ? "default" : u.porcentaje >= 50 ? "secondary" : "outline"}>
                        {u.porcentaje}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
