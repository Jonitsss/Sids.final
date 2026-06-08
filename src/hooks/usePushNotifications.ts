"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { requestPermission } from "@/lib/messaging"

export function usePushNotifications() {
  const { user, userData } = useAuth()
  const [permission, setPermission] = useState<NotificationPermission>("default")

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission)
    }
  }, [])

  useEffect(() => {
    if (!user || !userData) return
    if (userData.notificaciones === false) return

    const dismissed = localStorage.getItem("push-dismissed")
    if (dismissed) return

    requestPermission(user.uid).then((token) => {
      if (token) setPermission("granted")
    })
  }, [user, userData])

  const dismissPrompt = () => {
    localStorage.setItem("push-dismissed", "true")
    setPermission("denied")
  }

  return { permission, dismissPrompt }
}
