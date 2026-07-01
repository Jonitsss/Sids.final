'use client'

import { useState, useEffect } from 'react'
import { EscuelaMinisterios } from '@/types'
import { db } from '@/lib/firebase'
import { collection, onSnapshot } from 'firebase/firestore'
import { mapDoc } from '@/lib/firestore'

export function useEscuelaMinisterios() {
  const [escuelas, setEscuelas] = useState<EscuelaMinisterios[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db) { setLoading(false); return }

    const unsubscribe = onSnapshot(
      collection(db, 'escuela_ministerios'),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          ...mapDoc<EscuelaMinisterios>(doc),
        }))

        setEscuelas(data)
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching escuela_ministerios:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  return { escuelas, loading, error }
}
