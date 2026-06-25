"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Celula, TipoCelula, Usuario, MiembroCelula, ReporteCelula } from "@/types"
import { obtenerDocumentos, where, actualizarDocumento, crearDocumento, eliminarDocumento } from "@/lib/firestore"
import { logger } from "@/lib/logger"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Loader2, MapPin, Calendar, Users, Pencil, Plus, Trash2, FileText, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { Timestamp } from "@/lib/firestore"

const TIPO_LABELS: Record<TipoCelula, string> = {
  mujeres: "Mujeres",
  hombres: "Hombres",
  adolescentes_varones: "Adolescentes Varones",
  adolescentes_mujeres: "Adolescentes Mujeres",
  matrimonios: "Matrimonios",
}

export default function CelulaDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { userData } = useAuth()

  const esPastorOAdmin = userData?.rol === "pastor" || userData?.rol === "administrador"
  const esLiderCelula = userData?.rol === "lider_celula"
  const esColider = userData?.rol === "colider"

  const [celula, setCelula] = useState<Celula | null>(null)
  const [sinAcceso, setSinAcceso] = useState(false)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    nombre: "",
    tipo: "mujeres" as TipoCelula,
    direccion: "",
    dia: "Miércoles",
    hora: "20:00",
    liderId: "",
    coliderId: "",
    anfitrionId: "",
  })

  const [miembros, setMiembros] = useState<MiembroCelula[]>([])
  const [nuevoMiembroNombre, setNuevoMiembroNombre] = useState("")
  const [agregandoMiembro, setAgregandoMiembro] = useState(false)

  const [reportes, setReportes] = useState<ReporteCelula[]>([])
  const [showFormReporte, setShowFormReporte] = useState(false)
  const [expandedReporte, setExpandedReporte] = useState<string | null>(null)
  const [savingReporte, setSavingReporte] = useState(false)
  const [formReporte, setFormReporte] = useState({
    fecha: new Date().toISOString().split("T")[0],
    miembros: 0,
    invitados: 0,
    temaTratado: "",
    versiculoPrincipal: "",
    ofrenda: 0,
    recibio: "",
    observaciones: "",
    anfitrionId: "",
    coliderId: "",
    liderId: "",
    supervisado: "",
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const resultados = await obtenerDocumentos<Celula>("celulas", [
          where("__name__", "==", id),
        ])
        if (!mounted) return
        const c = resultados[0] || null
        setCelula(c)
        if (c && !esPastorOAdmin && c.liderId !== userData?.id && c.coliderId !== userData?.id && c.anfitrionId !== userData?.id) {
          setSinAcceso(true)
          setLoading(false)
          return
        }
        if (c) {
          setForm({
            nombre: c.nombre,
            tipo: c.tipo,
            direccion: c.direccion || "",
            dia: c.dia,
            hora: c.hora,
            liderId: c.liderId || "",
            coliderId: c.coliderId || "",
            anfitrionId: c.anfitrionId || "",
          })
          const todos = await obtenerDocumentos<Usuario>("usuarios", [where("activo", "==", true)])
          if (mounted) setUsuarios(todos)

          const miembrosDocs = await obtenerDocumentos<MiembroCelula>("miembros_celula", [
            where("celulaId", "==", c.id),
            where("activo", "==", true),
          ])
          if (mounted) setMiembros(miembrosDocs)

          const reportesDocs = await obtenerDocumentos<ReporteCelula>("reporte_celulas", [
            where("celulaId", "==", c.id),
            where("activo", "==", true),
          ])
          if (mounted) setReportes(reportesDocs.sort((a, b) => {
            const fa = a.fecha instanceof Date ? a.fecha : new Date(a.fecha)
            const fb = b.fecha instanceof Date ? b.fecha : new Date(b.fecha)
            return fb.getTime() - fa.getTime()
          }))
        }
      } catch (error) {
        if (mounted) logger.error("Error loading celula", error instanceof Error ? error : undefined)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  const handleSave = async () => {
    if (!celula) return
    setSaving(true)
    try {
      await actualizarDocumento("celulas", celula.id, {
        nombre: form.nombre,
        tipo: form.tipo,
        direccion: form.direccion,
        dia: form.dia,
        hora: form.hora,
        liderId: form.liderId,
        coliderId: form.coliderId,
        anfitrionId: form.anfitrionId,
      })
      setCelula((prev) => prev ? {
        ...prev,
        nombre: form.nombre,
        tipo: form.tipo,
        direccion: form.direccion,
        dia: form.dia,
        hora: form.hora,
        liderId: form.liderId,
        coliderId: form.coliderId,
        anfitrionId: form.anfitrionId,
      } : prev)
      setEditing(false)
      toast.success("Célula actualizada")
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const puedeEditarCelula = esPastorOAdmin || celula?.liderId === userData?.id || celula?.coliderId === userData?.id
  const puedeGestionarMiembros = esPastorOAdmin || celula?.liderId === userData?.id || celula?.coliderId === userData?.id

  const handleAgregarMiembro = async () => {
    const nombre = nuevoMiembroNombre.trim()
    if (!nombre || !celula) return
    setAgregandoMiembro(true)
    try {
      const nuevoId = await crearDocumento("miembros_celula", {
        celulaId: celula.id,
        nombre,
        activo: true,
        createdAt: new Date(),
        createdBy: userData?.id || "",
      })
      setMiembros((prev) => [...prev, {
        id: nuevoId,
        celulaId: celula.id,
        nombre,
        activo: true,
        createdAt: new Date(),
      }])
      setNuevoMiembroNombre("")
      toast.success("Miembro agregado")
    } catch {
      toast.error("Error al agregar miembro")
    } finally {
      setAgregandoMiembro(false)
    }
  }

  const handleEliminarMiembro = async (miembro: MiembroCelula) => {
    try {
      await eliminarDocumento("miembros_celula", miembro.id)
      setMiembros((prev) => prev.filter((m) => m.id !== miembro.id))
      toast.success("Miembro eliminado")
    } catch {
      toast.error("Error al eliminar miembro")
    }
  }

  const puedeCrearReporte = esPastorOAdmin || celula?.liderId === userData?.id

  const handleCrearReporte = async () => {
    if (!celula) return
    const f = formReporte
    if (!f.temaTratado.trim()) {
      toast.error("El tema tratado es obligatorio")
      return
    }
    setSavingReporte(true)
    try {
      const total = f.miembros + f.invitados
      const fechaDate = new Date(f.fecha + "T12:00:00")
      const nuevoId = await crearDocumento("reporte_celulas", {
        celulaId: celula.id,
        fecha: fechaDate,
        miembros: f.miembros,
        invitados: f.invitados,
        total,
        temaTratado: f.temaTratado,
        versiculoPrincipal: f.versiculoPrincipal,
        ofrenda: f.ofrenda,
        recibio: f.recibio,
        observaciones: f.observaciones,
        anfitrionId: f.anfitrionId,
        coliderId: f.coliderId,
        liderId: f.liderId,
        supervisado: f.supervisado,
        createdBy: userData?.id || "",
        activo: true,
        createdAt: new Date(),
      })
      const nuevoReporte: ReporteCelula = {
        id: nuevoId,
        celulaId: celula.id,
        fecha: fechaDate,
        miembros: f.miembros,
        invitados: f.invitados,
        total,
        temaTratado: f.temaTratado,
        versiculoPrincipal: f.versiculoPrincipal,
        ofrenda: f.ofrenda,
        recibio: f.recibio,
        observaciones: f.observaciones,
        anfitrionId: f.anfitrionId,
        coliderId: f.coliderId,
        liderId: f.liderId,
        supervisado: f.supervisado,
        createdBy: userData?.id || "",
        activo: true,
        createdAt: new Date(),
      }
      setReportes((prev) => [nuevoReporte, ...prev].sort((a, b) => {
        const fa = a.fecha instanceof Date ? a.fecha : new Date(a.fecha)
        const fb = b.fecha instanceof Date ? b.fecha : new Date(b.fecha)
        return fb.getTime() - fa.getTime()
      }))
      setFormReporte({
        fecha: new Date().toISOString().split("T")[0],
        miembros: 0, invitados: 0, temaTratado: "", versiculoPrincipal: "",
        ofrenda: 0, recibio: "", observaciones: "",
        anfitrionId: "", coliderId: "", liderId: "", supervisado: "",
      })
      setShowFormReporte(false)
      toast.success("Reporte creado")
    } catch {
      toast.error("Error al crear reporte")
    } finally {
      setSavingReporte(false)
    }
  }

  const formatearFecha = (fecha: Date | Timestamp) => {
    const d = fecha instanceof Date ? fecha : fecha.toDate()
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-40 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (sinAcceso) {
    return (
      <div className="p-8 text-center space-y-4">
        <Users className="h-12 w-12 mx-auto opacity-30 text-muted-foreground" />
        <div>
          <p className="text-lg font-medium">No tenés permiso para ver esta célula</p>
          <p className="text-sm text-muted-foreground">Solo podés ver las células donde estás asignado.</p>
        </div>
        <Link href="/ministerios/celulas">
          <Button variant="outline">Volver a células</Button>
        </Link>
      </div>
    )
  }

  if (!celula) {
    return <div className="p-8 text-center text-muted-foreground">Célula no encontrada</div>
  }

  const lider = usuarios.find((u) => u.id === celula.liderId)
  const colider = usuarios.find((u) => u.id === celula.coliderId)
  const anfitrion = usuarios.find((u) => u.id === celula.anfitrionId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/ministerios/celulas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input
              autoFocus
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="text-2xl font-bold h-auto py-1"
              placeholder="Nombre de la célula"
            />
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold truncate">{celula.nombre}</h1>
              {puedeEditarCelula && (
                <Button variant="ghost" size="icon" onClick={() => setEditing(true)} className="shrink-0">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{TIPO_LABELS[celula.tipo]}</Badge>
            <Badge variant="outline">Celular</Badge>
          </div>
        </div>
        {editing && (
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Guardar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        )}
      </div>

      {editing ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoCelula })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_LABELS) as TipoCelula[]).map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Día</Label>
                <Select value={form.dia} onValueChange={(v) => setForm({ ...form, dia: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} placeholder="Calle 123, Ciudad" />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Líder</Label>
              <Select value={form.liderId || "__none__"} onValueChange={(v) => setForm({ ...form, liderId: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar líder" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin asignar</SelectItem>
                  {usuarios.filter((u) => u.rol === "lider_celula").map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nombre} {u.apellido}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Colíder</Label>
              <Select value={form.coliderId || "__none__"} onValueChange={(v) => setForm({ ...form, coliderId: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar colíder" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin colíder</SelectItem>
                  {usuarios.filter((u) => u.rol === "colider" && u.id !== form.liderId).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nombre} {u.apellido}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Anfitrión</Label>
              <Select value={form.anfitrionId || "__none__"} onValueChange={(v) => setForm({ ...form, anfitrionId: v === "__none__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar anfitrión" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin anfitrión</SelectItem>
                  {usuarios.filter((u) => u.rol === "anfitrion").map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nombre} {u.apellido}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Día y hora</p>
                  <p className="font-medium">{celula.dia} a las {celula.hora}</p>
                </div>
              </div>
              {celula.direccion && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Dirección</p>
                    <p className="font-medium">{celula.direccion}</p>
                  </div>
                </div>
              )}
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-2">Líder</p>
                {lider ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">{lider.nombre?.[0]}{lider.apellido?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{lider.nombre} {lider.apellido}</p>
                      <p className="text-xs text-muted-foreground">{lider.email}</p>
                    </div>
                  </div>
                ) : <p className="text-sm text-muted-foreground">Sin asignar</p>}
              </div>
              {colider && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Colíder</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">{colider.nombre?.[0]}{colider.apellido?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{colider.nombre} {colider.apellido}</p>
                      <p className="text-xs text-muted-foreground">{colider.email}</p>
                    </div>
                  </div>
                </div>
              )}
              {anfitrion && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Anfitrión</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">{anfitrion.nombre?.[0]}{anfitrion.apellido?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{anfitrion.nombre} {anfitrion.apellido}</p>
                      <p className="text-xs text-muted-foreground">{anfitrion.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Ministerio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">Celular</p>
                <p className="text-sm text-muted-foreground">Coordinación de células y grupos pequeños</p>
                <Link href="/ministerios">
                  <Button variant="outline" size="sm" className="w-full mt-2">Ver ministerios</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Miembros ({miembros.length})
            </CardTitle>
            {puedeGestionarMiembros && (
              <div className="flex gap-2">
                <Input
                  placeholder="Nombre del miembro..."
                  value={nuevoMiembroNombre}
                  onChange={(e) => setNuevoMiembroNombre(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAgregarMiembro()}
                  className="w-64"
                />
                <Button size="sm" onClick={handleAgregarMiembro} disabled={agregandoMiembro || !nuevoMiembroNombre.trim()}>
                  {agregandoMiembro ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {miembros.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay miembros registrados. {puedeGestionarMiembros ? "Agregá el primero arriba." : ""}
            </p>
          ) : (
            <div className="space-y-1">
              {miembros.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 group">
                  <span className="text-sm">{m.nombre}</span>
                  {puedeGestionarMiembros && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                      onClick={() => handleEliminarMiembro(m)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reportes Semanales ({reportes.length})
            </CardTitle>
            {puedeCrearReporte && (
              <Button size="sm" onClick={() => setShowFormReporte(!showFormReporte)}>
                <Plus className="h-4 w-4 mr-1" />
                Nuevo Reporte
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showFormReporte && (
            <Card className="border border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Fecha</Label>
                    <Input type="date" value={formReporte.fecha} onChange={(e) => setFormReporte({ ...formReporte, fecha: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Miembros</Label>
                    <Input type="number" min={0} value={formReporte.miembros || ""} onChange={(e) => setFormReporte({ ...formReporte, miembros: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Invitados</Label>
                    <Input type="number" min={0} value={formReporte.invitados || ""} onChange={(e) => setFormReporte({ ...formReporte, invitados: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Tema Tratado *</Label>
                    <Input value={formReporte.temaTratado} onChange={(e) => setFormReporte({ ...formReporte, temaTratado: e.target.value })} placeholder="Tema de la reunión" />
                  </div>
                  <div className="space-y-1">
                    <Label>Versículo Principal</Label>
                    <Input value={formReporte.versiculoPrincipal} onChange={(e) => setFormReporte({ ...formReporte, versiculoPrincipal: e.target.value })} placeholder="Juan 3:16" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Ofrenda ($)</Label>
                    <Input type="number" min={0} value={formReporte.ofrenda || ""} onChange={(e) => setFormReporte({ ...formReporte, ofrenda: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Recibió</Label>
                    <Input value={formReporte.recibio} onChange={(e) => setFormReporte({ ...formReporte, recibio: e.target.value })} placeholder="Nombre de quien recibió" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Supervisado por</Label>
                    <Input value={formReporte.supervisado} onChange={(e) => setFormReporte({ ...formReporte, supervisado: e.target.value })} placeholder="Nombre del supervisor" />
                  </div>
                  <div className="space-y-1">
                    <Label>Anfitrión</Label>
                    <Select value={formReporte.anfitrionId || "__none__"} onValueChange={(v) => setFormReporte({ ...formReporte, anfitrionId: v === "__none__" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin asignar</SelectItem>
                        {usuarios.filter((u) => u.rol === "anfitrion").map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.nombre} {u.apellido}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Líder</Label>
                    <Select value={formReporte.liderId || "__none__"} onValueChange={(v) => setFormReporte({ ...formReporte, liderId: v === "__none__" ? "" : v })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin asignar</SelectItem>
                        {usuarios.filter((u) => u.rol === "lider_celula").map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.nombre} {u.apellido}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Observaciones</Label>
                  <textarea
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formReporte.observaciones}
                    onChange={(e) => setFormReporte({ ...formReporte, observaciones: e.target.value })}
                    placeholder="Notas generales..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowFormReporte(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleCrearReporte} disabled={savingReporte}>
                    {savingReporte ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Guardar Reporte
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {reportes.length === 0 && !showFormReporte ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay reportes registrados. {puedeCrearReporte ? "Creá el primero con el botón de arriba." : ""}
            </p>
          ) : (
            <div className="space-y-2">
              {reportes.map((r) => {
                const isExpanded = expandedReporte === r.id
                const total = r.miembros + r.invitados
                return (
                  <Card key={r.id} className="hover:bg-accent/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedReporte(isExpanded ? null : r.id)}>
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium">{formatearFecha(r.fecha)}</p>
                            <p className="text-xs text-muted-foreground">{r.temaTratado}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm">
                              <span className="text-muted-foreground">M:</span> {r.miembros}
                              <span className="text-muted-foreground ml-2">I:</span> {r.invitados}
                              <span className="text-muted-foreground ml-2">T:</span> {total}
                            </p>
                            {r.ofrenda > 0 && <p className="text-xs text-muted-foreground">${r.ofrenda.toLocaleString("es-AR")}</p>}
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div><span className="text-muted-foreground">Miembros:</span> {r.miembros}</div>
                            <div><span className="text-muted-foreground">Invitados:</span> {r.invitados}</div>
                            <div><span className="text-muted-foreground">Total:</span> {total}</div>
                            {r.ofrenda > 0 && <div><span className="text-muted-foreground">Ofrenda:</span> ${r.ofrenda.toLocaleString("es-AR")}</div>}
                          </div>
                          {r.versiculoPrincipal && <p><span className="text-muted-foreground">Versículo:</span> {r.versiculoPrincipal}</p>}
                          {r.recibio && <p><span className="text-muted-foreground">Recibió:</span> {r.recibio}</p>}
                          {r.supervisado && <p><span className="text-muted-foreground">Supervisado:</span> {r.supervisado}</p>}
                          {r.observaciones && <p><span className="text-muted-foreground">Observaciones:</span> {r.observaciones}</p>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
