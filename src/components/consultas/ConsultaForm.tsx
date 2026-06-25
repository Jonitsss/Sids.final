"use client"

import { Consulta, Usuario } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Send } from "lucide-react"
import { rolLabel } from "@/lib/utils"

const TIPO_LABELS: Record<string, string> = {
  sugerencia: "Sugerencia",
  tema: "Tema",
  consulta: "Consulta",
  urgente: "Urgente",
}

interface ConsultaFormProps {
  form: { tipo: Consulta["tipo"]; a: string; asunto: string; mensaje: string }
  setForm: (fn: (prev: { tipo: Consulta["tipo"]; a: string; asunto: string; mensaje: string }) => { tipo: Consulta["tipo"]; a: string; asunto: string; mensaje: string }) => void
  usuarios: Usuario[]
  usuariosLoading: boolean
  sending: boolean
  onSubmit: () => void
}

export function ConsultaForm({ form, setForm, usuarios, usuariosLoading, sending, onSubmit }: ConsultaFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select value={form.tipo} onValueChange={(v) => setForm((prev) => ({ ...prev, tipo: v as Consulta["tipo"] }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sugerencia">Sugerencia</SelectItem>
            <SelectItem value="tema">Tema</SelectItem>
            <SelectItem value="consulta">Consulta</SelectItem>
            <SelectItem value="urgente">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Destinatario</Label>
        <Select value={form.a} onValueChange={(v) => setForm((prev) => ({ ...prev, a: v }))}>
          <SelectTrigger>
            <SelectValue placeholder={usuariosLoading ? "Cargando..." : "Seleccionar"} />
          </SelectTrigger>
          <SelectContent>
            {usuarios.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.nombre} {u.apellido} ({rolLabel(u.rol)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Asunto</Label>
        <Input value={form.asunto} onChange={(e) => setForm((prev) => ({ ...prev, asunto: e.target.value }))} placeholder="Ej: Propuesta de nuevo horario" />
      </div>
      <div className="space-y-2">
        <Label>Mensaje</Label>
        <Textarea value={form.mensaje} onChange={(e) => setForm((prev) => ({ ...prev, mensaje: e.target.value }))} placeholder="Describí tu propuesta, consulta o sugerencia..." rows={4} />
      </div>
      <Button onClick={onSubmit} disabled={!form.asunto || !form.mensaje || !form.a || sending} className="w-full">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Enviar Consulta
      </Button>
    </div>
  )
}
