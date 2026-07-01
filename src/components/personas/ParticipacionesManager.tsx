"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Loader2, Shield, ShieldOff } from "lucide-react"
import { obtenerDocumentos, actualizarDocumento } from "@/lib/firestore"
import { useDashboardStore } from "@/stores/dashboardStore"
import { Participacion, Ministerio } from "@/types"
import { toast } from "sonner"

interface Props {
  personaId: string
  participaciones: Participacion[]
  puedeEditar: boolean
}

interface SelectableEntity {
  id: string
  nombre: string
}

export function ParticipacionesManager({ personaId, participaciones, puedeEditar }: Props) {
  const { ministerios } = useDashboardStore()
  const [celulas, setCelulas] = useState<SelectableEntity[]>([])
  const [escuelas, setEscuelas] = useState<SelectableEntity[]>([])
  const [loadingLists, setLoadingLists] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    refTipo: "ministerio" as Participacion["refTipo"],
    refId: "",
    refNombre: "",
    rol: "",
    esEncargado: false,
    activo: true,
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [celulasDocs, escuelasDocs] = await Promise.all([
          obtenerDocumentos<any>("celulas", []),
          obtenerDocumentos<any>("escuela_ministerios", []),
        ])
        if (!mounted) return
        setCelulas(celulasDocs.map((c) => ({ id: c.id, nombre: c.nombre })))
        setEscuelas(escuelasDocs.map((e) => ({ id: e.id, nombre: e.nombre })))
      } catch {
        // silent
      } finally {
        if (mounted) setLoadingLists(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const entidadesDisponibles = (): SelectableEntity[] => {
    switch (form.refTipo) {
      case "ministerio": return ministerios.map((m: Ministerio) => ({ id: m.id, nombre: m.nombre }))
      case "celula": return celulas
      case "escuela_ministerios": return escuelas
    }
  }

  const handleTipoChange = (tipo: Participacion["refTipo"]) => {
    setForm({ ...form, refTipo: tipo, refId: "", refNombre: "" })
  }

  const handleEntityChange = (id: string) => {
    const entity = entidadesDisponibles().find((e) => e.id === id)
    setForm({ ...form, refId: id, refNombre: entity?.nombre || "" })
  }

  const handleAdd = async () => {
    if (!form.refId || !form.rol.trim()) {
      toast.error("Completá la entidad y el rol")
      return
    }
    setSaving(true)
    const now = new Date()
    const newParticipation: Participacion = {
      id: crypto.randomUUID(),
      personaId,
      refTipo: form.refTipo,
      refId: form.refId,
      refNombre: form.refNombre,
      rol: form.rol.trim(),
      esEncargado: form.esEncargado,
      activo: form.activo,
      fechaInicio: now,
      createdAt: now,
      updatedAt: now,
    }
    try {
      await actualizarDocumento("personas", personaId, {
        participaciones: [...participaciones, newParticipation],
      })
      toast.success("Participación agregada")
      setAdding(false)
      setForm({ refTipo: "ministerio", refId: "", refNombre: "", rol: "", esEncargado: false, activo: true })
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActivo = async (idx: number, current: boolean) => {
    const updated = participaciones.map((p, i) =>
      i === idx ? { ...p, activo: !current, updatedAt: new Date() } : p,
    )
    try {
      await actualizarDocumento("personas", personaId, { participaciones: updated })
    } catch {
      toast.error("Error al actualizar")
    }
  }

  const handleRemove = async (idx: number) => {
    const updated = participaciones.filter((_, i) => i !== idx)
    try {
      await actualizarDocumento("personas", personaId, { participaciones: updated })
      toast.success("Participación eliminada")
    } catch {
      toast.error("Error al eliminar")
    }
  }

  const activas = participaciones.filter((p) => p.activo)
  const inactivas = participaciones.filter((p) => !p.activo)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Participaciones</CardTitle>
        {puedeEditar && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)} disabled={adding}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && (
          <div className="p-4 rounded-lg border space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.refTipo} onValueChange={(v) => handleTipoChange(v as Participacion["refTipo"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ministerio">Ministerio</SelectItem>
                    <SelectItem value="celula">Célula</SelectItem>
                    <SelectItem value="escuela_ministerios">Esc. Ministerios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Entidad</Label>
                <Select value={form.refId} onValueChange={handleEntityChange} disabled={loadingLists}>
                  <SelectTrigger><SelectValue placeholder={loadingLists ? "Cargando..." : "Seleccionar..."} /></SelectTrigger>
                  <SelectContent>
                    {entidadesDisponibles().map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Rol</Label>
                <Input
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  placeholder="Ej: Miembro, Líder, etc."
                />
              </div>
              <div className="flex items-end gap-4 pb-1">
                <div className="flex items-center gap-2">
                  <Switch
                    id="esEncargado"
                    checked={form.esEncargado}
                    onCheckedChange={(v) => setForm({ ...form, esEncargado: v })}
                  />
                  <Label htmlFor="esEncargado" className="text-sm">Encargado</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="activo"
                    checked={form.activo}
                    onCheckedChange={(v) => setForm({ ...form, activo: v })}
                  />
                  <Label htmlFor="activo" className="text-sm">Activo</Label>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setAdding(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={saving || !form.refId || !form.rol.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </div>
          </div>
        )}

        {loadingLists ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : participaciones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Sin participaciones registradas</p>
            {puedeEditar && <p className="text-sm">Agregá ministerios, células o escuelas donde participa</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {activas.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">ACTIVAS</p>
                {activas.map((p, i) => {
                  const idx = participaciones.indexOf(p)
                  return (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {p.refTipo === "ministerio" ? "Min" : p.refTipo === "celula" ? "Cel" : "EM"}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.refNombre}</p>
                          <p className="text-xs text-muted-foreground">{p.rol}{p.esEncargado && " 🛡️"}</p>
                        </div>
                      </div>
                      {puedeEditar && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActivo(idx, true)} title="Desactivar">
                            <ShieldOff className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemove(idx)} title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {inactivas.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">INACTIVAS</p>
                {inactivas.map((p) => {
                  const idx = participaciones.indexOf(p)
                  return (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0 opacity-60">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {p.refTipo === "ministerio" ? "Min" : p.refTipo === "celula" ? "Cel" : "EM"}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.refNombre}</p>
                          <p className="text-xs text-muted-foreground">{p.rol}</p>
                        </div>
                      </div>
                      {puedeEditar && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActivo(idx, false)} title="Reactivar">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemove(idx)} title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
