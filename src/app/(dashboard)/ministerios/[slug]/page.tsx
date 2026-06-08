"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Ministerio, Usuario } from "@/types"
import { obtenerDocumentos, where, actualizarDocumento } from "@/lib/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MinisterioDetailSkeleton } from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowLeft, UserPlus, Plus, Trash2, Save, Loader2, Search, Check } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function MinisterioDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const [ministerio, setMinisterio] = useState<Ministerio | null>(null)
  const [miembros, setMiembros] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<string[]>([])
  const [nuevoRol, setNuevoRol] = useState("")
  const [savingRoles, setSavingRoles] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [disponibles, setDisponibles] = useState<Usuario[]>([])
  const [loadingDisponibles, setLoadingDisponibles] = useState(false)
  const [buscador, setBuscador] = useState("")
  const [agregando, setAgregando] = useState<string | null>(null)

  const handleOpenDialog = async () => {
    setDialogOpen(true)
    if (disponibles.length > 0 || !ministerio) return
    setLoadingDisponibles(true)
    try {
      const todos = await obtenerDocumentos<Usuario>("usuarios", [where("activo", "==", true)])
      const miembrosIds = new Set(miembros.map((m) => m.id))
      setDisponibles(todos.filter((u) => !miembrosIds.has(u.id)))
    } catch {
      toast.error("Error al cargar usuarios")
    } finally {
      setLoadingDisponibles(false)
    }
  }

  const handleAgregarMiembro = async (usuario: Usuario) => {
    if (!ministerio || agregando) return
    setAgregando(usuario.id)
    const nuevosIds = [...(usuario.ministerioIds || []), ministerio.id]
    setMiembros((prev) => [...prev, { ...usuario, ministerioIds: nuevosIds }])
    setDisponibles((prev) => prev.filter((u) => u.id !== usuario.id))
    try {
      await actualizarDocumento("usuarios", usuario.id, { ministerioIds: nuevosIds })
      toast.success(`${usuario.nombre} agregado a ${ministerio.nombre}`)
    } catch {
      setMiembros((prev) => prev.filter((m) => m.id !== usuario.id))
      setDisponibles((prev) => [...prev, usuario])
      toast.error("Error al agregar miembro")
    } finally {
      setAgregando(null)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const resultados = await obtenerDocumentos<Ministerio>("ministerios", [
          where("slug", "==", slug),
          where("activo", "==", true),
        ])
        if (!mounted) return
        const m = resultados[0] || null
        setMinisterio(m)
        if (m) {
          setRoles(m.roles || [])
          const usuarios = await obtenerDocumentos<Usuario>("usuarios", [
            where("ministerioIds", "array-contains", m.id),
            where("activo", "==", true),
          ])
          if (mounted) setMiembros(usuarios)
        }
      } catch (error) {
        if (mounted) console.error(error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [slug])

  const handleAddRol = () => {
    const rol = nuevoRol.trim()
    if (!rol || roles.includes(rol)) return
    setRoles([...roles, rol])
    setNuevoRol("")
  }

  const handleRemoveRol = (rol: string) => {
    setRoles(roles.filter((r) => r !== rol))
  }

  const handleSaveRoles = async () => {
    if (!ministerio) return
    setSavingRoles(true)
    try {
      await actualizarDocumento("ministerios", ministerio.id, { roles })
      setMinisterio((prev) => prev ? { ...prev, roles } : prev)
      toast.success("Roles guardados")
    } catch {
      toast.error("Error al guardar roles")
    } finally {
      setSavingRoles(false)
    }
  }

  if (loading) return <MinisterioDetailSkeleton />
  if (!ministerio) return <div className="p-8 text-center text-muted-foreground">Ministerio no encontrado</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/ministerios">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{ministerio.nombre}</h1>
          <p className="text-muted-foreground">{ministerio.descripcion}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleOpenDialog}>
                <UserPlus className="h-4 w-4" />
                Agregar Miembro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Agregar Miembro a {ministerio.nombre}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar colaborador..."
                    className="pl-8"
                    value={buscador}
                    onChange={(e) => setBuscador(e.target.value)}
                  />
                </div>
                {loadingDisponibles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : disponibles.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    Todos los colaboradores ya son miembros de este ministerio
                  </p>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {disponibles
                      .filter(
                        (u) =>
                          `${u.nombre} ${u.apellido}`.toLowerCase().includes(buscador.toLowerCase()) ||
                          u.email.toLowerCase().includes(buscador.toLowerCase())
                      )
                      .map((u) => (
                        <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {u.nombre[0]}{u.apellido[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.nombre} {u.apellido}</p>
                            <p className="text-xs text-muted-foreground capitalize">{u.rol}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0"
                            onClick={() => handleAgregarMiembro(u)}
                            disabled={agregando === u.id}
                          >
                            {agregando === u.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            Agregar
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {roles.map((rol) => (
          <Badge key={rol}>{rol}</Badge>
        ))}
      </div>

      <Tabs defaultValue="miembros">
        <TabsList>
          <TabsTrigger value="miembros">Miembros ({miembros.length})</TabsTrigger>
          <TabsTrigger value="roles">Roles ({roles.length})</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="miembros" className="space-y-4">
          {miembros.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No hay miembros en este ministerio
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
              {miembros.map((miembro) => (
                <Card key={miembro.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {miembro.nombre?.[0]}{miembro.apellido?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{miembro.nombre} {miembro.apellido}</p>
                      <p className="text-sm text-muted-foreground capitalize">{miembro.rol}</p>
                    </div>
                    <Badge variant="secondary">Miembro</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Roles del Ministerio</CardTitle>
                <Button size="sm" onClick={handleSaveRoles} disabled={savingRoles}>
                  {savingRoles ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nuevo rol..."
                  value={nuevoRol}
                  onChange={(e) => setNuevoRol(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddRol()}
                />
                <Button variant="outline" size="icon" onClick={handleAddRol}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay roles. Agregá el primero arriba.
                  </p>
                ) : (
                  roles.map((rol) => (
                    <div key={rol} className="flex items-center justify-between p-3 rounded-lg border group">
                      <span>{rol}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive/80 hover:bg-transparent h-7 w-7"
                        onClick={() => handleRemoveRol(rol)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Ministerio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Color</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: ministerio.color }} />
                  <span className="text-sm text-muted-foreground">{ministerio.color}</span>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium">ID del Líder</p>
                <p className="text-sm text-muted-foreground">{ministerio.liderId || "Sin asignar"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
