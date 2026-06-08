"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { requestPermission, onForegroundMessage } from "@/lib/messaging"
import { toast } from "sonner"

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
    if (permission === "granted") return

    const dismissed = localStorage.getItem("push-dismissed")
    if (dismissed) return

    requestPermission(user.uid).then((token) => {
      if (token) setPermission("granted")
    })
  }, [user, userData, permission])

  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {}
      if (title) {
        toast(title, { description: body || "" })
      }
    })
    return unsubscribe
  }, [])

  const dismissPrompt = () => {
    localStorage.setItem("push-dismissed", "true")
    setPermission("denied")
  }

  return { permission, dismissPrompt }
}
