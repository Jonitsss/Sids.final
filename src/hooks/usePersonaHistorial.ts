"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { mapDoc } from "@/lib/firestore"
import { HistorialPersona } from "@/types"

const TIPO_LABELS: Record<string, string> = {
  bautismo: "Bautismo",
  ministerio: "Ministerio",
  celula: "Célula",
  escuela: "Escuela",
  rol: "Rol",
  evento: "Evento",
  servicio: "Servicio",
  membresia: "Membresía",
  presentacion_nino: "Presentación de Niño",
  visita_pastoral: "Visita Pastoral",
  consejeria: "Consejería",
  discipulado: "Discipulado",
}

const TIPO_ICONOS: Record<string, string> = {
  bautismo: "🌈",
  ministerio: "🔧",
  celula: "🏠",
  escuela: "📚",
  rol: "👤",
  evento: "📅",
  servicio: "🙏",
  membresia: "✅",
  presentacion_nino: "👶",
  visita_pastoral: "👋",
  consejeria: "💬",
  discipulado: "📖",
}

export function usePersonaHistorial(personaId: string) {
  const [historial, setHistorial] = useState<HistorialPersona[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !personaId) {
      setLoading(false)
      return
    }

    const q = query(
      collection(db, "personas", personaId, "historial"),
      orderBy("fechaInicio", "desc")
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        setHistorial(snap.docs.map((doc) => mapDoc<HistorialPersona>(doc)))
        setLoading(false)
      },
      () => setLoading(false)
    )

    return () => unsub()
  }, [personaId])

  return { historial, loading, TIPO_LABELS, TIPO_ICONOS }
}
