"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Trash2, Loader2, Pencil } from "lucide-react"
import { Usuario, Rol, Notificacion } from "@/types"
import { obtenerDocumentos, eliminarDocumento, crearDocumento, actualizarDocumento } from "@/lib/firestore"
import { useAuth } from "@/contexts/AuthContext"
import { useMinisterios } from "@/hooks/useMinisterios"
import { toast } from "sonner"

export default function UsuariosPage() {
  const { userData } = useAuth()
  const { ministerios } = useMinisterios()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    rol: "colaborador" as Rol,
    ministerioIds: [] as string[],
    notificaciones: true,
  })

  const esPastor = userData?.rol === "pastor"

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await obtenerDocumentos<Usuario>("usuarios")
        if (mounted) setUsuarios(data)
      } catch (error) {
        if (mounted) console.error("Error fetching usuarios:", error)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [refreshKey])

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  const filtered = usuarios.filter(
    (u) =>
      `${u.nombre} ${u.apellido}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = async () => {
    if (!form.nombre || !form.email) return
    const email = form.email.toLowerCase().trim()
    const existe = usuarios.find((u) => u.email.toLowerCase() === email)
    if (existe) {
      toast.error("Ya existe un usuario con ese email")
      return
    }
    try {
      await crearDocumento<Usuario>("usuarios", {
        nombre: form.nombre,
        apellido: form.apellido,
        email,
        telefono: form.telefono,
        rol: form.rol,
        ministerioIds: form.ministerioIds,
        fotoURL: "",
        notificaciones: form.notificaciones,
        activo: true,
      })
      toast.success("Perfil creado. La persona debe registrarse con ese email.")
      setOpen(false)
      setForm({ nombre: "", apellido: "", email: "", telefono: "", rol: "colaborador", ministerioIds: [], notificaciones: true })
      refetch()
    } catch {
      toast.error("Error al crear usuario")
    }
  }

  const openEdit = (u: Usuario) => {
    setEditId(u.id)
    setForm({
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      telefono: u.telefono,
      rol: u.rol,
      ministerioIds: u.ministerioIds || [],
      notificaciones: u.notificaciones ?? true,
    })
    setEditOpen(true)
  }

  const handleEditSave = async () => {
    if (!editId || !form.nombre) return
    try {
      const oldUser = usuarios.find((u) => u.id === editId)
      const oldIds = oldUser?.ministerioIds || []
      const newIds = form.ministerioIds.filter((id) => !oldIds.includes(id))

      await actualizarDocumento("usuarios", editId, {
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email.toLowerCase().trim(),
        telefono: form.telefono,
        rol: form.rol,
        ministerioIds: form.ministerioIds,
        notificaciones: form.notificaciones,
      })

      for (const mid of newIds) {
        const min = ministerios.find((m) => m.id === mid)
        if (min) {
          await crearDocumento<Notificacion>("notificaciones", {
            usuarioId: (oldUser as any)?.authUid || editId,
            titulo: "Nuevo ministerio",
            mensaje: `Has sido asignado al ministerio "${min.nombre}"`,
            leido: false,
            tipo: "ministerio",
            referenciaId: mid,
          })
        }
      }

      toast.success("Usuario actualizado")
      setEditOpen(false)
      setEditId(null)
      refetch()
    } catch {
      toast.error("Error al actualizar usuario")
    }
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el usuario "${nombre}"?`)) return
    setUsuarios((prev) => prev.filter((u) => u.id !== id))
    try {
      await eliminarDocumento("usuarios", id)
      toast.success("Usuario eliminado")
    } catch {
      toast.error("Error al eliminar usuario")
      refetch()
    }
  }

  const toggleMinisterio = (id: string) => {
    setForm((prev) => ({
      ...prev,
      ministerioIds: prev.ministerioIds.includes(id)
        ? prev.ministerioIds.filter((m) => m !== id)
        : [...prev.ministerioIds, id],
    }))
  }

  const rolBadge: Record<string, "default" | "secondary" | "outline"> = {
    pastor: "default",
    lider: "secondary",
    colaborador: "outline",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">Gestiona los colaboradores del sistema</p>
        </div>
        {esPastor && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Crear Perfil de Usuario</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido</Label>
                    <Input value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select value={form.rol} onValueChange={(v: Rol) => setForm({ ...form, rol: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pastor">Pastor</SelectItem>
                      <SelectItem value="lider">Líder</SelectItem>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ministerios</Label>
                  {ministerios.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay ministerios creados</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {ministerios.map((m) => (
                        <Badge
                          key={m.id}
                          variant={form.ministerioIds.includes(m.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          style={form.ministerioIds.includes(m.id) ? { backgroundColor: m.color } : {}}
                          onClick={() => toggleMinisterio(m.id)}
                        >
                          {m.nombre}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm font-medium">Notificaciones</Label>
                    <p className="text-xs text-muted-foreground">Recibir alertas de nuevas asignaciones</p>
                  </div>
                  <Switch
                    checked={form.notificaciones}
                    onCheckedChange={(v) => setForm({ ...form, notificaciones: v })}
                  />
                </div>
                <Button className="w-full" onClick={handleCreate}>
                  Crear Perfil
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  La persona debe registrarse con este email para vincular su cuenta.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuarios..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : usuarios.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No hay usuarios</p>
            <p className="text-sm">Los usuarios registrados aparecerán aquí</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-4 group">
                  <Avatar>
                    <AvatarImage src={u.fotoURL} alt="Foto" className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {u.nombre?.[0]}{u.apellido?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{u.nombre} {u.apellido}</p>
                    <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={rolBadge[u.rol]} className="capitalize">{u.rol}</Badge>
                    {u.ministerioIds?.map((mid) => {
                      const min = ministerios.find((m) => m.id === mid)
                      return min ? (
                        <Badge key={mid} variant="outline" className="text-xs" style={{ borderColor: min.color, color: min.color }}>
                          {min.nombre}
                        </Badge>
                      ) : null
                    })}
                    {esPastor && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(u)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive/80 hover:bg-transparent"
                          onClick={() => handleDelete(u.id, `${u.nombre} ${u.apellido}`)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Apellido</Label>
                <Input value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={form.rol} onValueChange={(v: Rol) => setForm({ ...form, rol: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pastor">Pastor</SelectItem>
                  <SelectItem value="lider">Líder</SelectItem>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ministerios</Label>
              {ministerios.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay ministerios creados</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ministerios.map((m) => (
                    <Badge
                      key={m.id}
                      variant={form.ministerioIds.includes(m.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      style={form.ministerioIds.includes(m.id) ? { backgroundColor: m.color } : {}}
                      onClick={() => toggleMinisterio(m.id)}
                    >
                      {m.nombre}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Notificaciones</Label>
                <p className="text-xs text-muted-foreground">Recibir alertas de nuevas asignaciones</p>
              </div>
              <Switch
                checked={form.notificaciones}
                onCheckedChange={(v) => setForm({ ...form, notificaciones: v })}
              />
            </div>
            <Button className="w-full" onClick={handleEditSave}>
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
