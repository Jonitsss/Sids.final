"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Calendar, Clock, MapPin, Users } from "lucide-react"
import Link from "next/link"

export default function EventoDetailPage() {
  const params = useParams()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/eventos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Reunión General</h1>
          <p className="text-muted-foreground">Jueves 4 de Junio, 2026</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm">Editar</Button>
          <Button size="sm">Crear Grilla</Button>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Detalles del Evento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Jueves 4 de Junio, 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>20:00 - 21:30</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>Templo Principal</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>Reunión General</span>
            </div>
            <Separator />
            <div>
              <h3 className="font-medium mb-2">Ministerios Involucrados</h3>
              <div className="flex flex-wrap gap-2">
                {["Músicos", "Sonido", "Multimedia", "Diáconos"].map((m) => (
                  <Badge key={m} variant="secondary">{m}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grilla de Servicio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-8 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground mb-2">No hay grilla creada</p>
              <Button>Crear Grilla</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
