"use client"

import { Usuario, Ministerio, Rol } from "@/types"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, UserCheck, UserX } from "lucide-react"
import { rolLabel } from "@/lib/utils"

interface UsuarioRowProps {
  usuario: Usuario
  ministerios: Ministerio[]
  esPastor: boolean
  onEdit: (u: Usuario) => void
  onDelete: (id: string, nombre: string) => void
  onToggleActivo: (u: Usuario) => void
}

const rolBadge: Record<string, "default" | "secondary" | "outline"> = {
  pastor: "default",
  administrador: "default",
  lider: "secondary",
  lider_celula: "secondary",
  colider: "secondary",
  anfitrion: "outline",
  colaborador: "outline",
}

export function UsuarioRow({ usuario: u, ministerios, esPastor, onEdit, onDelete, onToggleActivo }: UsuarioRowProps) {
  return (
    <div className="flex items-start gap-3 p-4 group">
      <Avatar className="shrink-0 mt-0.5">
        <AvatarImage src={u.fotoURL} alt="Foto" className="object-cover" />
        <AvatarFallback className="bg-primary/10 text-primary">
          {u.nombre?.[0]}{u.apellido?.[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <p className="font-medium">{u.nombre} {u.apellido}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={rolBadge[u.rol]}>{rolLabel(u.rol)}</Badge>
            {u.activo === false && (
              <Badge variant="warning">Pendiente</Badge>
            )}
            {u.ministerioIds?.map((mid) => {
              const min = ministerios.find((m) => m.id === mid)
              return min ? (
                <Badge key={mid} variant="outline" className="text-xs" style={{ borderColor: min.color, color: min.color }}>
                  {min.nombre}
                </Badge>
              ) : null
            })}
          </div>
        </div>
        <p className="text-sm text-muted-foreground truncate mt-0.5">{u.email}</p>
        {esPastor && (
          <div className="flex items-center gap-1 mt-2">
            {u.activo === false && (
              <Button
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-700 hover:bg-transparent"
                onClick={() => onToggleActivo(u)}
              >
                <UserCheck className="h-3.5 w-3.5 mr-1" />
                Aprobar
              </Button>
            )}
            {u.activo !== false && u.rol !== "pastor" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-orange-600 hover:text-orange-700 hover:bg-transparent"
                onClick={() => onToggleActivo(u)}
              >
                <UserX className="h-3.5 w-3.5 mr-1" />
                Desactivar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(u)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive/80 hover:bg-transparent"
              onClick={() => onDelete(u.id, `${u.nombre} ${u.apellido}`)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Eliminar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
