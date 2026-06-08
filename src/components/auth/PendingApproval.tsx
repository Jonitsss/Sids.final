"use client"

import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, LogOut } from "lucide-react"

export function PendingApproval() {
  const { logout, userData } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Cuenta pendiente de aprobación</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Tu cuenta está esperando la aprobación de un administrador.
          </p>
          {userData && (
            <p className="text-sm text-muted-foreground">
              {userData.nombre} {userData.apellido} · {userData.email}
            </p>
          )}
          <p className="text-xs text-muted-foreground/60">
            Te notificaremos cuando tu cuenta sea activada.
          </p>
          <Button variant="outline" onClick={logout} className="mt-4">
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
