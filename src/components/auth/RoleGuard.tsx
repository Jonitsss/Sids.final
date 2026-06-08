"use client"

import { ReactNode } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Rol } from "@/types"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: Rol[]
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { userData, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && userData && !allowedRoles.includes(userData.rol)) {
      router.push("/dashboard")
    }
  }, [userData, loading, allowedRoles, router])

  if (loading) return null
  if (!userData || !allowedRoles.includes(userData.rol)) return null

  return <>{children}</>
}
