"use client"

import { useState, useEffect, useRef } from "react"
import { useMinisterios } from "@/hooks/useMinisterios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CardGridSkeleton } from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { Plus, Building2, Music, Volume2, Monitor, BookOpen, Trash2, Loader2 } from "lucide-react"
import { crearDocumento, eliminarDocumento, obtenerDocumentos, where, actualizarDocumento } from "@/lib/firestore"
import { Ministerio, Notificacion, Usuario } from "@/types"
import { MINISTERIOS_PREDETERMINADOS } from "@/lib/constants"
import { slugify } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

const iconos: Record<string, any> = { Building2, Music, Volume2, Monitor, BookOpen }

export default function MinisteriosPage() {
  const { ministerios, loading, setMinisterios } = useMinisterios()
  const { userData } = useAuth()
  const esPastor = userData?.rol === "pastor"
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ nombre: "", descripcion: "" })
  const [creating, setCreating] = useState(false)
  const cleaned = useRef(false)

  useEffect(() => {
    if (!esPastor || cleaned.current || loading || ministerios.length === 0) return
    ;(async () => {
      cleaned.current = true
      const ministerioIds = new Set(ministerios.map((m) => m.id))
      const notifs = await obtenerDocumentos<Notificacion>("notificaciones", [
        where("tipo", "==", "ministerio"),
      ])
      const aEliminar = notifs.filter((n) => !ministerioIds.has(n.referenciaId))
      for (const n of aEliminar) {
        await eliminarDocumento("notificaciones", n.id)
      }
    })()
  }, [esPastor, loading, ministerios])

  const slugBackfilled = useRef(false)

  useEffect(() => {
    if (slugBackfilled.current || loading) return
    const sinSlug = ministerios.filter((m) => !m.slug)
    if (sinSlug.length === 0) return
    slugBackfilled.current = true
    ;(async () => {
      for (const m of sinSlug) {
        const slug = slugify(m.nombre)
        await actualizarDocumento("ministerios", m.id, { slug })
      }
    })()
  }, [loading, ministerios])

  const handleCreate = async () => {
    if (!form.nombre || creating) return
    setCreating(true)

    const slug = slugify(form.nombre)

    const existentes = await obtenerDocumentos<Ministerio>("ministerios", [
      where("slug", "==", slug),
    ])
    const slugFinal = existentes.length === 0 ? slug : `${slug}-${existentes.length}`

    const tempId = `temp_${Date.now()}`
    const optimistic: Ministerio = {
      id: tempId,
      slug: slugFinal,
      nombre: form.nombre,
      descripcion: form.descripcion,
      roles: [],
      liderId: "",
      color: "#73A243",
      icono: "Building2",
      activo: true,
      createdAt: new Date(),
    }
    setMinisterios((prev) => [optimistic, ...prev])
    setOpen(false)
    setForm({ nombre: "", descripcion: "" })

    try {
      await crearDocumento<Ministerio>("ministerios", {
        slug: slugFinal,
        nombre: form.nombre,
        descripcion: form.descripcion,
        roles: [],
        liderId: "",
        color: "#73A243",
        icono: "Building2",
        activo: true,
      })
      toast.success("Ministerio creado exitosamente")
    } catch {
      setMinisterios((prev) => prev.filter((m) => m.id !== tempId))
      toast.error("Error al crear ministerio")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el ministerio "${nombre}"? Se eliminarán las notificaciones y referencias asociadas.`)) return
    const anterior = ministerios
    setMinisterios((prev) => prev.filter((m) => m.id !== id))
    try {
      const notificaciones = await obtenerDocumentos<Notificacion>("notificaciones", [
        where("tipo", "==", "ministerio"),
        where("referenciaId", "==", id),
      ])
      await Promise.all(notificaciones.map((n) => eliminarDocumento("notificaciones", n.id)))

      const usuarios = await obtenerDocumentos<Usuario>("usuarios", [
        where("ministerioIds", "array-contains", id),
      ])
      await Promise.all(
        usuarios.map((u) => {
          const nuevosIds = (u.ministerioIds || []).filter((mid) => mid !== id)
          if (nuevosIds.length !== (u.ministerioIds || []).length) {
            return actualizarDocumento("usuarios", u.id, { ministerioIds: nuevosIds })
          }
        })
      )

      await eliminarDocumento("ministerios", id)
    } catch {
      setMinisterios(anterior)
      toast.error("Error al eliminar ministerio")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ministerios</h1>
          <p className="text-muted-foreground">Gestiona los ministerios de la iglesia</p>
        </div>
        {esPastor && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo Ministerio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Ministerio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del ministerio" />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción breve" />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {loading ? (
        <CardGridSkeleton cols={3} count={6} />
      ) : ministerios.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No hay ministerios</p>
            <p className="text-sm">Crea el primer ministerio para empezar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {ministerios.map((m) => {
            const Icon = iconos[m.icono] || Building2
            return (
              <Card key={m.id} className="hover:shadow-md transition-shadow group">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Link href={`/ministerios/${m.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: m.color + "20" }}>
                      <Icon className="h-5 w-5" style={{ color: m.color }} />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{m.nombre}</CardTitle>
                      <p className="text-xs text-muted-foreground truncate">{m.descripcion}</p>
                    </div>
                  </Link>
                  {esPastor && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80 hover:bg-transparent"
                      onClick={() => handleDelete(m.id, m.nombre)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {m.roles?.map((rol) => (
                      <Badge key={rol} variant="secondary" className="text-xs">{rol}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
