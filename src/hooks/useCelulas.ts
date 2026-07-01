"use client"

import { useState, useEffect } from "react"
import { Celula, Administer } from "@/types"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, or, and } from "firebase/firestore"
import { mapDoc } from "@/lib/firestore"

export function useCelulas(
  usuarioId?: string,
  administer?: Administer | null,
  ministerioId?: string,
  ramaId?: string,
) {
  const [celulas, setCelulas] = useState<Celula[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) { setLoading(false); return }
    setLoading(true)

    const constraints: any[] = []

    if (ramaId) {
      constraints.push(
        and(
          where("activo", "==", true),
          where("ramaId", "==", ramaId)
        )
      )
    } else if (ministerioId && administer?.ministerios?.includes(ministerioId)) {
      constraints.push(
        and(
          where("activo", "==", true),
          where("ministerioId", "==", ministerioId)
        )
      )
    } else if (administer?.celulas?.length ?? 0 > 0) {
      const adminCelulas = administer?.celulas ?? []
      const adminMinisterios = administer?.ministerios ?? []
      if (adminCelulas.length > 0 || adminMinisterios.length > 0) {
        const orClauses: any[] = []
        if (adminCelulas.length > 0) {
          orClauses.push(where("__name__", "in", adminCelulas.slice(0, 10)))
        }
        if (adminMinisterios.length > 0) {
          orClauses.push(where("ministerioId", "in", adminMinisterios.slice(0, 10)))
        }
        if (usuarioId) {
          orClauses.push(
            or(
              where("liderId", "==", usuarioId),
              where("coliderId", "==", usuarioId),
              where("anfitrionId", "==", usuarioId),
            )
          )
        }
        constraints.push(and(where("activo", "==", true), or(...orClauses)))
      } else if (usuarioId) {
        constraints.push(
          and(
            where("activo", "==", true),
            or(
              where("liderId", "==", usuarioId),
              where("coliderId", "==", usuarioId),
              where("anfitrionId", "==", usuarioId),
            )
          )
        )
      } else {
        constraints.push(where("activo", "==", true))
      }
    } else if (usuarioId) {
      constraints.push(
        and(
          where("activo", "==", true),
          or(
            where("liderId", "==", usuarioId),
            where("coliderId", "==", usuarioId),
            where("anfitrionId", "==", usuarioId),
          )
        )
      )
    } else {
      constraints.push(where("activo", "==", true))
    }

    const q = query(collection(db, "celulas"), ...constraints)
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCelulas(snap.docs.map((doc) => mapDoc<Celula>(doc)))
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsub
  }, [usuarioId, administer, ministerioId, ramaId])

  return { celulas, loading, setCelulas }
}
