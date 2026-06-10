import Link from "next/link"
import { Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground mb-6">Página no encontrada</p>
      <Link href="/">
        <Button variant="outline">
          <Home className="h-4 w-4 mr-2" />
          Volver al inicio
        </Button>
      </Link>
    </div>
  )
}
