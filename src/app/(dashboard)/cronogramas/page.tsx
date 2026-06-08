"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { CalendarDays, Plus, Loader2, Trash2 } from "lucide-react"
import { CronogramaSkeleton } from "@/components/skeletons"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { useEventos } from "@/hooks/useEventos"
import { useCronogramas } from "@/hooks/useCronogramas"
import { crearDocumento, eliminarDocumento, obtenerDocumentos, where } from "@/lib/firestore"
import { GrillaServicio, Notificacion } from "@/types"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

export default function CronogramasPage() {
  const { eventos, loading: loadingEventos } = useEventos()
  const { cronogramas, loading: loadingCrono, setCronogramas } = useCronogramas()
  const { userData } = useAuth()
  const esPastor = userData?.rol === "pastor"
  const puedeCrear = esPastor || userData?.rol === "lider"
  const [open, setOpen] = useState(false)
  const [selectedEventoId, setSelectedEventoId] = useState("")
  const [creating, setCreating] = useState(false)
  const cleaned = useRef(false)

  useEffect(() => {
    if (!esPastor || cleaned.current || loadingEventos || loadingCrono) return
    ;(async () => {
      cleaned.current = true
      const ids = cronogramas.filter((g) => !eventos.find((e) => e.id === g.eventoId)).map((g) => g.id)
      if (ids.length === 0) return
      for (const id of ids) {
        const prefix = `asignacion:${id}:`
        const notificaciones = await obtenerDocumentos<Notificacion>("notificaciones", [
          where("referenciaId", ">=", prefix),
          where("referenciaId", "<", prefix + "\uf8ff"),
        ])
        for (const notif of notificaciones) {
          await eliminarDocumento("notificaciones", notif.id)
        }
        await eliminarDocumento("cronogramas", id)
      }
    })()
  }, [esPastor, loadingEventos, loadingCrono, cronogramas, eventos])

  const eventoSeleccionado = eventos.find((e) => e.id === selectedEventoId)

  const handleCreate = async () => {
    if (!selectedEventoId || creating) return
    setCreating(true)
    setOpen(false)
    setSelectedEventoId("")
    try {
      await crearDocumento("cronogramas", {
        eventoId: selectedEventoId,
        fecha: eventoSeleccionado?.fecha || new Date(),
        asignaciones: [],
        notas: "",
      })
    } catch {
      toast.error("Error al crear grilla")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta grilla?")) return
    const anterior = cronogramas
    setCronogramas((prev) => prev.filter((g) => g.id !== id))
    try {
      await eliminarDocumento("cronogramas", id)
    } catch {
      setCronogramas(anterior)
      toast.error("Error al eliminar grilla")
    }
  }

  if (loadingEventos || loadingCrono) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cronogramas</h1>
            <p className="text-muted-foreground">Grillas de servicio para cada reunión</p>
          </div>
        </div>
        <CronogramaSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cronogramas</h1>
          <p className="text-muted-foreground">Grillas de servicio para cada reunión</p>
        </div>
        <div className="flex gap-2">
          {puedeCrear && (
          <Button onClick={() => setOpen(true)} disabled={eventos.length === 0}>
            <CalendarDays className="h-4 w-4" />
            Nueva Grilla
          </Button>
          )}
        </div>
      </div>

      {cronogramas.length === 0 ? (
        eventos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-1">No hay cronogramas</p>
              <p className="text-sm">No hay eventos creados. Creá un evento primero para poder armar una grilla.</p>
              <Link href="/eventos">
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4" />
                  Ir a Eventos
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-1">No hay cronogramas</p>
              <p className="text-sm">Crea una grilla de servicio para una reunión</p>
              {puedeCrear && (
              <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>
                Crear Primera Grilla
              </Button>
              )}
            </CardContent>
          </Card>
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cronogramas.map((g) => {
            const evento = eventos.find((e) => e.id === g.eventoId)
            return (
              <Link key={g.id} href={`/cronogramas/${g.id}`}>
                <Card className="group cursor-pointer transition-colors hover:border-primary/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {evento ? (
                            <>{evento.titulo} <span className="text-xs text-muted-foreground font-normal">{evento.tipo === "reunion_general" ? "Reunión General" : evento.tipo === "ensayo" ? "Ensayo" : evento.tipo === "jovenes" ? "Jóvenes" : evento.tipo === "escuela_biblica" ? "Esc. Bíblica" : "Especial"}</span></>
                          ) : (
                            <span className="text-destructive/70">Evento eliminado</span>
                          )}
                        </CardTitle>
                      </div>
                      {esPastor && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive/80 hover:bg-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(ev) => { ev.preventDefault(); handleDelete(g.id) }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      {format(g.fecha, "EEEE d MMMM yyyy", { locale: es })}
                      {evento?.horaInicio && <span>— {evento.horaInicio}</span>}
                    </div>
                    {g.asignaciones.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {g.asignaciones.filter((a) => a.estado === "confirmado").length} confirmados / {g.asignaciones.length} asignados
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Grilla de Servicio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reunión</Label>
              <Select value={selectedEventoId} onValueChange={setSelectedEventoId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar reunión" /></SelectTrigger>
                <SelectContent>
                  {eventos.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.titulo} — {format(ev.fecha, "EEEE d MMM", { locale: es })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">La configuración de roles se hará desde cada ministerio.</p>
            <Button className="w-full" onClick={handleCreate} disabled={!selectedEventoId || creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear Grilla
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
