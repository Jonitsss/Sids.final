"use client"

import { Notificacion, Ministerio } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell, Check, X, Loader2, Clock, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface NotificacionCardProps {
  notificacion: Notificacion
  ministerios: Ministerio[]
  fechasGrilla: Record<string, string>
  eventosGrilla: Record<string, string>
  respondiendo: string | null
  onAceptar: (id: string) => void
  onRechazar: (id: string) => void
  onMarcarLeido: (id: string) => void
  onEliminar: (id: string) => void
}

export function NotificacionCard({ notificacion: n, ministerios, fechasGrilla, eventosGrilla, respondiendo, onAceptar, onRechazar, onMarcarLeido, onEliminar }: NotificacionCardProps) {
  const getMensajeFormateado = () => {
    if (n.mensaje.startsWith("Se confirmó") || n.mensaje.startsWith("Se rechazó")) return n.mensaje
    if (!n.referenciaId?.startsWith("asignacion:")) return n.mensaje
    const p = n.referenciaId.split(":")
    const gridId = p[1], ministerioId = p[2], rol = p[3]
    const fecha = fechasGrilla[gridId]
    const evento = eventosGrilla[gridId]
    if (!fecha || !evento || !rol) return n.mensaje
    const ministerioNombre = ministerios.find((m) => m.id === ministerioId)?.nombre || ""
    const match = n.mensaje.match(/^(.+?)\s+(confirmó|rechazó):/)
    if (!match) return n.mensaje
    const accion = match[2] === "confirmó" ? "confirmó" : "rechazó"
    return `Se ${accion} la asignación de ${match[1]} como "${rol}" en ${ministerioNombre} para "${evento}" del ${fecha}.`
  }

  return (
    <Card className={n.leido ? "opacity-60" : "border-l-2 border-l-primary"}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary"><Bell className="h-4 w-4" /></AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{n.titulo}</p>
            <p className="text-sm text-muted-foreground break-words line-clamp-3">{getMensajeFormateado()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {n.createdAt ? format(new Date(n.createdAt), "d MMM HH:mm", { locale: es }) : ""}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {n.tipo === "asignacion" && !n.leido && (
                <>
                  <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => onAceptar(n.id)} disabled={respondiendo === n.id}>
                    {respondiendo === n.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Aceptar
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:text-destructive"
                    onClick={() => onRechazar(n.id)} disabled={respondiendo === n.id}>
                    <X className="h-3 w-3" /> Rechazar
                  </Button>
                </>
              )}
              {n.leido ? (
                <>
                  <Badge variant="outline" className="text-xs">Leída</Badge>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-transparent" onClick={() => onEliminar(n.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onMarcarLeido(n.id)}>Marcar como leída</Button>
              )}
            </div>
          </div>
          {n.tipo === "asignacion" && !n.leido && (
            <Badge variant="secondary" className="shrink-0"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
