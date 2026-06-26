"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Eye, EyeOff, Clock, LogOut } from "lucide-react"
import { toast } from "sonner"
import { APP_VERSION } from "@/lib/version"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const { login, user, userData, loading, resetPassword, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user && userData?.activo !== false) router.replace("/dashboard")
  }, [user, userData, loading, router])

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Cargando...</p>
      <p className="text-xs text-muted-foreground/50">v{APP_VERSION}</p>
    </div>
  )

  if (user && userData?.activo === false) return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-xl">Cuenta pendiente</CardTitle>
        <CardDescription>Tu cuenta está esperando aprobación de un administrador.</CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">{userData?.nombre} {userData?.apellido}</p>
        <p className="text-xs text-muted-foreground/60">Te notificaremos cuando sea activada.</p>
        <Button variant="outline" onClick={logout} className="mt-2">
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </CardContent>
    </Card>
  )

  if (user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await login(email.toLowerCase().trim(), password)
      toast.success("Inicio de sesión exitoso")
    } catch (error: any) {
      const mensajes: Record<string, string> = {
        "auth/user-not-found": "Usuario no encontrado",
        "auth/wrong-password": "Contraseña incorrecta",
        "auth/invalid-credential": "Credenciales inválidas",
        "auth/invalid-email": "Correo electrónico inválido",
        "auth/too-many-requests": "Demasiados intentos. Intente más tarde",
      }
      toast.error(mensajes[error.code] || "Error al iniciar sesión")
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email.trim()) {
      toast.error("Ingresá tu correo electrónico primero")
      return
    }
    setResetting(true)
    try {
      await resetPassword(email.trim().toLowerCase())
      toast.success("Correo de restablecimiento enviado. Revisá tu bandeja.")
    } catch (error: any) {
      const mensajes: Record<string, string> = {
        "auth/user-not-found": "No existe una cuenta con ese correo",
        "auth/invalid-email": "Correo electrónico inválido",
      }
      toast.error(mensajes[error.code] || "Error al enviar correo")
    } finally {
      setResetting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">SIDS</CardTitle>
        <CardDescription>Inicia sesión para continuar</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-base"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                className="text-base pr-10"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetting}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                {resetting ? "Enviando..." : "¿Olvidaste tu contraseña?"}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Iniciar Sesión
          </Button>
          <p className="text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Registrarse
            </Link>
          </p>
          <p className="text-xs text-muted-foreground/50">v{APP_VERSION}</p>
        </CardFooter>
      </form>
    </Card>
  )
}
