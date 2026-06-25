"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Loader2 } from "lucide-react"
import { Usuario, Rol } from "@/types"
import { eliminarDocumento, crearDocumento, actualizarDocumento, enviarNotificacion } from "@/lib/firestore"
import { asignarRolUsuario, RolValido } from "@/lib/roles"
import { useAuth } from "@/contexts/AuthContext"
import { useDashboardStore } from "@/stores/dashboardStore"
import { toast } from "sonner"
import { rolLabel } from "@/lib/utils"
import { UsuarioForm } from "@/components/usuarios/UsuarioForm"
import { UsuarioRow } from "@/components/usuarios/UsuarioRow"

export default function UsuariosPage() {
  const { userData } = useAuth()
  const { ministerios, usuarios, usuariosLoading, setUsuarios } = useDashboardStore()
  const [search, setSearch] = useState("")
  const [filtro, setFiltro] = useState<"todos" | "activos" | "inactivos">("todos")
  const [pagina, setPagina] = useState(1)
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

  const esPastor = userData?.rol === "pastor" || userData?.rol === "administrador"
  const ITEMS_PER_PAGE = 10

  const counts = {
    todos: usuarios.length,
    activos: usuarios.filter((u) => u.activo !== false).length,
    inactivos: usuarios.filter((u) => u.activo === false).length,
  }

  const filtered = usuarios
    .filter((u) => {
      if (filtro === "activos" && u.activo === false) return false
      if (filtro === "inactivos" && u.activo !== false) return false
      if (search) {
        const s = search.toLowerCase()
        const nombre = `${u.nombre || ""} ${u.apellido || ""}`.toLowerCase()
        const email = u.email?.toLowerCase() || ""
        return nombre.includes(s) || email.includes(s)
      }
      return true
    })
    .sort((a, b) => {
      if (a.activo === false && b.activo !== false) return -1
      if (a.activo !== false && b.activo === false) return 1
      return 0
    })

  const visible = filtered.slice(0, pagina * ITEMS_PER_PAGE)
  const hasMore = visible.length < filtered.length

  const resetForm = () => setForm({ nombre: "", apellido: "", email: "", telefono: "", rol: "colaborador", ministerioIds: [], notificaciones: true })

  const handleCreate = async () => {
    if (!form.nombre || !form.email) return
    const email = form.email.toLowerCase().trim()
    if (usuarios.find((u) => u.email.toLowerCase() === email)) {
      toast.error("Ya existe un usuario con ese email")
      return
    }
    try {
      await crearDocumento<Usuario>("usuarios", {
        nombre: form.nombre, apellido: form.apellido, email,
        telefono: form.telefono, rol: form.rol, ministerioIds: form.ministerioIds,
        fotoURL: "", notificaciones: form.notificaciones, activo: true,
      })
      toast.success("Perfil creado. La persona debe registrarse con ese email.")
      setOpen(false)
      resetForm()
    } catch {
      toast.error("Error al crear usuario")
    }
  }

  const openEdit = (u: Usuario) => {
    setEditId(u.id)
    setForm({
      nombre: u.nombre, apellido: u.apellido, email: u.email,
      telefono: u.telefono, rol: u.rol, ministerioIds: u.ministerioIds || [],
      notificaciones: u.notificaciones ?? true,
    })
    setEditOpen(true)
  }

  const handleEditSave = async () => {
    if (!editId || !form.nombre) return
    const oldUser = usuarios.find((u) => u.id === editId)
    const oldIds = oldUser?.ministerioIds || []
    const newIds = form.ministerioIds.filter((id) => !oldIds.includes(id))

    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === editId
          ? { ...u, nombre: form.nombre, apellido: form.apellido, email: form.email.toLowerCase().trim(), telefono: form.telefono, rol: form.rol, ministerioIds: form.ministerioIds, notificaciones: form.notificaciones }
          : u
      )
    )
    setEditOpen(false)
    setEditId(null)
    toast.success("Usuario actualizado")

    actualizarDocumento("usuarios", editId, {
      nombre: form.nombre, apellido: form.apellido, email: form.email.toLowerCase().trim(),
      telefono: form.telefono, rol: form.rol, ministerioIds: form.ministerioIds,
      notificaciones: form.notificaciones,
    }).catch(() => toast.error("Error al guardar cambios"))

    if (oldUser?.rol !== form.rol) {
      asignarRolUsuario(oldUser?.authUid || editId, form.rol as RolValido).catch(() => {})
      enviarNotificacion({
        usuarioId: (oldUser as any)?.authUid || editId,
        titulo: "Tu rol ha sido actualizado",
        mensaje: `Tu rol cambió de "${rolLabel(oldUser?.rol)}" a "${rolLabel(form.rol)}".`,
        tipo: "rol", referenciaId: editId,
      }).catch(() => {})
    }

    for (const mid of newIds) {
      const min = ministerios.find((m) => m.id === mid)
      if (min) {
        enviarNotificacion({
          usuarioId: (oldUser as any)?.authUid || editId,
          titulo: "Nuevo ministerio",
          mensaje: `Has sido incorporado al ministerio "${min.nombre}".`,
          tipo: "ministerio", referenciaId: mid,
        }).catch(() => {})
      }
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
    }
  }

  const handleToggleActivo = async (u: Usuario) => {
    const nuevoEstado = u.activo === false
    try {
      await actualizarDocumento("usuarios", u.id, { activo: nuevoEstado })
      if (nuevoEstado) {
        await enviarNotificacion({
          usuarioId: u.authUid || u.id,
          titulo: "Cuenta aprobada",
          mensaje: "Tu cuenta ha sido aprobada. Ya podés acceder al dashboard.",
          tipo: "aprobacion", referenciaId: u.id,
        })
        toast.success("Usuario aprobado y notificado")
      } else {
        toast.success("Usuario desactivado")
      }
    } catch {
      toast.error("Error al actualizar usuario")
    }
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
              <Button><Plus className="h-4 w-4" />Nuevo Usuario</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Crear Perfil de Usuario</DialogTitle></DialogHeader>
              <UsuarioForm form={form} setForm={setForm} ministerios={ministerios} />
              <Button className="w-full" onClick={handleCreate}>Crear Perfil</Button>
              <p className="text-xs text-muted-foreground text-center">
                La persona debe registrarse con este email para vincular su cuenta.
              </p>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar usuarios..." value={search} onChange={(e) => { setSearch(e.target.value); setPagina(1) }} className="pl-9" />
        </div>
        <Select value={filtro} onValueChange={(v) => { setFiltro(v as typeof filtro); setPagina(1) }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos ({counts.todos})</SelectItem>
            <SelectItem value="activos">Activos ({counts.activos})</SelectItem>
            <SelectItem value="inactivos">Inactivos ({counts.inactivos})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {usuariosLoading ? (
        <Card><CardContent className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-1">{usuarios.length === 0 ? "No hay usuarios" : "Sin resultados"}</p>
          <p className="text-sm">{usuarios.length === 0 ? "Los usuarios registrados aparecerán aquí" : "No se encontraron usuarios con este filtro"}</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <div className="divide-y">
            {visible.map((u) => (
              <UsuarioRow key={u.id} usuario={u} ministerios={ministerios} esPastor={esPastor}
                onEdit={openEdit} onDelete={handleDelete} onToggleActivo={handleToggleActivo} />
            ))}
          </div>
        </CardContent></Card>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setPagina((p) => p + 1)}>
            Cargar más ({filtered.length - visible.length} restantes)
          </Button>
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Usuario</DialogTitle></DialogHeader>
          <UsuarioForm form={form} setForm={setForm} ministerios={ministerios} />
          <Button className="w-full" onClick={handleEditSave}>Guardar Cambios</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
