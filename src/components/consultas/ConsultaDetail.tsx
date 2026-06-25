"use client"

import { Consulta } from "@/types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, X, CheckCircle, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const TIPO_LABELS: Record<string, string> = { sugerencia: "Sugerencia", tema: "Tema", consulta: "Consulta", urgente: "Urgente" }
const ESTADO_LABELS: Record<string, string> = { pendiente: "Pendiente", respondido: "Respondido", cerrado: "Cerrado" }
const TIPO_VARIANTS: Record<string, "default" | "secondary" | "outline" | "warning" | "destructive"> = { sugerencia: "secondary", tema: "default", consulta: "outline", urgente: "destructive" }
const ESTADO_VARIANTS: Record<string, "default" | "secondary" | "outline" | "warning" | "destructive"> = { pendiente: "warning", respondido: "default", cerrado: "secondary" }

interface ConsultaDetailProps {
  consulta: Consulta
  esPastorOAdmin: boolean
  respuesta: string
  setRespuesta: (v: string) => void
  sending: boolean
  onResponder: () => void
  onCerrar: (c: Consulta) => void
  onEliminar: (c: Consulta) => void
}

export function ConsultaDetail({ consulta, esPastorOAdmin, respuesta, setRespuesta, sending, onResponder, onCerrar, onEliminar }: ConsultaDetailProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={TIPO_VARIANTS[consulta.tipo]}>{TIPO_LABELS[consulta.tipo]}</Badge>
        <Badge variant={ESTADO_VARIANTS[consulta.estado]}>{ESTADO_LABELS[consulta.estado]}</Badge>
        <span className="text-xs text-muted-foreground">
          {format(new Date(consulta.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
        </span>
      </div>

      <div className="text-sm">
        <p className="font-medium">{esPastorOAdmin ? `De: ${consulta.deNombre}` : `Para: ${consulta.aNombre}`}</p>
      </div>

      <div className="p-3 rounded-lg border bg-card/50">
        <p className="text-sm whitespace-pre-wrap">{consulta.mensaje}</p>
      </div>

      {consulta.respuesta && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5 text-primary" />
            Respuesta
          </p>
          <div className="p-3 rounded-lg border bg-primary/5">
            <p className="text-sm whitespace-pre-wrap">{consulta.respuesta}</p>
          </div>
        </div>
      )}

      {esPastorOAdmin && consulta.estado !== "cerrado" && (
        <div className="space-y-2">
          <Label>Responder</Label>
          <Textarea value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Escribí tu respuesta..." rows={3} />
          <div className="flex gap-2">
            <Button onClick={onResponder} disabled={!respuesta.trim() || sending} className="flex-1">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Responder
            </Button>
            <Button variant="outline" onClick={() => onCerrar(consulta)} disabled={sending}>
              <X className="h-4 w-4" />
              Cerrar
            </Button>
          </div>
        </div>
      )}

      {esPastorOAdmin && (
        <Button variant="outline" className="w-full text-destructive hover:text-destructive/80 hover:bg-transparent" onClick={() => onEliminar(consulta)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar consulta
        </Button>
      )}

      {!esPastorOAdmin && consulta.estado === "respondido" && (
        <Button variant="outline" onClick={() => onCerrar(consulta)} className="w-full">
          <CheckCircle className="h-4 w-4" />
          Marcar como resuelto
        </Button>
      )}
    </div>
  )
}
