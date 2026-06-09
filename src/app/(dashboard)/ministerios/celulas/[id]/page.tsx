"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Celula, TipoCelula, Usuario } from "@/types"
import { obtenerDocumentos, where, actualizarDocumento } from "@/lib/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Loader2, MapPin, Calendar, Users, Pencil } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"

const TIPO_LABELS: Record<TipoCelula, string> = {
  mujeres: "Mujeres",
  hombres: "Hombres",
  adolescentes_varones: "Adolescentes Varones",
  adolescentes_mujeres: "Adolescentes Mujeres",
  matrimonios: "Matrimonios",
}

export default function CelulaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { userData } = useAuth()

  const esPastorOAdmin = userData?.rol === "pastor" || userData?.rol === "administrador"
  const esLider = userData?.rol === "lider"
  const esLiderCelula = esPastorOAdmin || esLider

  const [celula, setCelula] = useState<Celula | null>(null)
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
        }
      } catch (error) {
        if (mounted) console.error(error)
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-40 bg-muted animate-pulse rounded" />
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
              {esLiderCelula && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(true)}
                  className="shrink-0"
                >
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
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoCelula })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={form.hora}
                  onChange={(e) => setForm({ ...form, hora: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                placeholder="Calle 123, Ciudad"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Líder</Label>
              <Select value={form.liderId || "__none__"} onValueChange={(v) => setForm({ ...form, liderId: v === "__none__" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar líder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin asignar</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nombre} {u.apellido}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Colíder</Label>
              <Select value={form.coliderId || "__none__"} onValueChange={(v) => setForm({ ...form, coliderId: v === "__none__" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar colíder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin colíder</SelectItem>
                  {usuarios.filter((u) => u.id !== form.liderId).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nombre} {u.apellido}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Anfitrión</Label>
              <Select value={form.anfitrionId || "__none__"} onValueChange={(v) => setForm({ ...form, anfitrionId: v === "__none__" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar anfitrión" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin anfitrión</SelectItem>
                  {usuarios.map((u) => (
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
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {lider.nombre?.[0]}{lider.apellido?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{lider.nombre} {lider.apellido}</p>
                      <p className="text-xs text-muted-foreground">{lider.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin asignar</p>
                )}
              </div>
              {colider && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Colíder</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {colider.nombre?.[0]}{colider.apellido?.[0]}
                      </AvatarFallback>
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
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {anfitrion.nombre?.[0]}{anfitrion.apellido?.[0]}
                      </AvatarFallback>
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
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Ver ministerios
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
