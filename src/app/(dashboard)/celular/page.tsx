"use client"

import { useRouter } from "next/navigation"
import { useDashboardStore } from "@/stores/dashboardStore"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CardGridSkeleton } from "@/components/skeletons"
import { Button } from "@/components/ui/button"
import { Users, ArrowRight, Network } from "lucide-react"
import { TIPO_LABELS } from "@/lib/celulas"

export default function CelularHubPage() {
  const router = useRouter()
  const { userData } = useAuth()
  const { ramas, ramasLoading, ministerios } = useDashboardStore()

  const ministerioCelular = ministerios.find((m) => m.nombre === "Celular")
  const esPastorOAdmin = userData?.rol === "pastor" || userData?.rol === "administrador"

  if (ramasLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Ministerio Celular</h1>
          <p className="text-muted-foreground">Cargando ramas...</p>
        </div>
        <CardGridSkeleton cols={2} count={4} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ministerio Celular</h1>
          <p className="text-muted-foreground">Grupos pequeños que se reúnen en casas</p>
        </div>
      </div>

      {ramas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Network className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No hay ramas configuradas</p>
            <p className="text-sm">
              {esPastorOAdmin ? "Creá las ramas para empezar" : "Contactá al pastor para configurar las ramas"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {ramas.map((rama) => (
            <Card
              key={rama.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/celular/ramas/${rama.id}`)}
            >
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="p-2 rounded-lg shrink-0 bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base truncate">{rama.nombre}</CardTitle>
                  <p className="text-xs text-muted-foreground">{TIPO_LABELS[rama.tipo] || rama.tipo}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardHeader>
              <CardContent className="space-y-2">
                {rama.encargadoId && (
                  <p className="text-xs text-muted-foreground">Encargado asignado</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
