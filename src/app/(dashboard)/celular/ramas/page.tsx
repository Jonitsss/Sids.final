"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDashboardStore } from "@/stores/dashboardStore"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, ArrowLeft, Loader2, ShieldCheck } from "lucide-react"
import { TIPO_LABELS } from "@/lib/celulas"
import { actualizarDocumento } from "@/lib/firestore"
import { toast } from "sonner"

export default function RamasAdminPage() {
  const router = useRouter()
  const { userData } = useAuth()
  const { ramas, ramasLoading, usuarios, usuariosLoading } = useDashboardStore()
  const esPastorOAdmin = userData?.rol === "pastor" || userData?.rol === "administrador"
  const [guardando, setGuardando] = useState<string | null>(null)

  if (!esPastorOAdmin) {
    return (
      <div className="p-8 text-center space-y-4">
        <ShieldCheck className="h-12 w-12 mx-auto opacity-30 text-muted-foreground" />
        <p className="text-lg font-medium">Acceso restringido</p>
        <p className="text-sm text-muted-foreground">Solo pastor y administrador pueden gestionar ramas.</p>
        <Button variant="outline" onClick={() => router.push("/celular")}>Volver</Button>
      </div>
    )
  }

  const handleAsignarEncargado = async (ramaId: string, encargadoId: string) => {
    setGuardando(ramaId)
    try {
      await actualizarDocumento("ramas_celular", ramaId, { encargadoId: encargadoId || null })
      toast.success(encargadoId ? "Encargado asignado" : "Encargado removido")
    } catch {
      toast.error("Error al guardar")
    } finally {
      setGuardando(null)
    }
  }

  if (ramasLoading || usuariosLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/celular")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Gestión de Ramas</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/celular")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Gestión de Ramas</h1>
          <p className="text-muted-foreground">Asigná encargados a cada rama del Ministerio Celular</p>
        </div>
      </div>

      <div className="grid gap-4">
        {ramas.map((rama) => {
          const encargado = usuarios.find((u) => u.id === rama.encargadoId)
          return (
            <Card key={rama.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{rama.nombre}</h3>
                      <p className="text-sm text-muted-foreground">{TIPO_LABELS[rama.tipo] || rama.tipo}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    {encargado ? (
                      <Badge variant="secondary" className="shrink-0">
                        {encargado.nombre} {encargado.apellido}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground shrink-0">Sin encargado</Badge>
                    )}

                    <Select
                      value={rama.encargadoId || "__none__"}
                      onValueChange={(v) => handleAsignarEncargado(rama.id, v === "__none__" ? "" : v)}
                      disabled={guardando === rama.id}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Seleccionar encargado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin encargado</SelectItem>
                        {usuarios
                          .filter((u) => u.activo)
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.nombre} {u.apellido}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    {guardando === rama.id && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
