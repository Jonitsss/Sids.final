import { create } from "zustand"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore"
import { mapDoc } from "@/lib/firestore"
import { Ministerio, Usuario, Notificacion, Consulta, RamaCelular, Persona } from "@/types"

interface DashboardStore {
  ministerios: Ministerio[]
  ministeriosLoading: boolean
  ramas: RamaCelular[]
  ramasLoading: boolean
  usuarios: Usuario[]
  usuariosLoading: boolean
  personas: Persona[]
  personasLoading: boolean
  notificaciones: Notificacion[]
  notificacionesLoading: boolean
  noLeidas: number
  consultas: Consulta[]
  consultasLoading: boolean
  consultasNoLeidas: number

  initMinisterios: () => void
  initRamas: () => void
  initUsuarios: () => void
  initPersonas: () => void
  initNotificaciones: (usuarioId: string) => void
  initConsultas: (usuarioId: string, rol: string) => void
  cleanup: () => void
  refreshAll: (usuarioId: string, rol: string) => void

  setMinisterios: (ministeriosOrFn: Ministerio[] | ((prev: Ministerio[]) => Ministerio[])) => void
  setRamas: (ramasOrFn: RamaCelular[] | ((prev: RamaCelular[]) => RamaCelular[])) => void
  setUsuarios: (usuariosOrFn: Usuario[] | ((prev: Usuario[]) => Usuario[])) => void
  setPersonas: (personasOrFn: Persona[] | ((prev: Persona[]) => Persona[])) => void
  setNotificaciones: (notifsOrFn: Notificacion[] | ((prev: Notificacion[]) => Notificacion[])) => void
  setConsultas: (consultas: Consulta[]) => void
}

let unsubMinisterios: (() => void) | null = null
let unsubRamas: (() => void) | null = null
let unsubUsuarios: (() => void) | null = null
let unsubPersonas: (() => void) | null = null
let unsubNotificaciones: (() => void) | null = null
let unsubConsultas: (() => void) | null = null

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  ministerios: [],
  ministeriosLoading: true,
  ramas: [],
  ramasLoading: true,
  usuarios: [],
  usuariosLoading: true,
  personas: [],
  personasLoading: true,
  notificaciones: [],
  notificacionesLoading: true,
  noLeidas: 0,
  consultas: [],
  consultasLoading: true,
  consultasNoLeidas: 0,

  initMinisterios: () => {
    if (!db || unsubMinisterios) return
    const q = query(collection(db, "ministerios"), where("activo", "==", true))
    unsubMinisterios = onSnapshot(
      q,
      (snap) => {
        set({ ministerios: snap.docs.map((doc) => mapDoc<Ministerio>(doc)), ministeriosLoading: false })
      },
      () => set({ ministeriosLoading: false })
    )
  },

  initRamas: () => {
    if (!db || unsubRamas) return
    const q = query(collection(db, "ramas_celular"), where("activo", "==", true))
    unsubRamas = onSnapshot(
      q,
      (snap) => {
        set({ ramas: snap.docs.map((doc) => mapDoc<RamaCelular>(doc)), ramasLoading: false })
      },
      () => set({ ramasLoading: false })
    )
  },

  initUsuarios: () => {
    if (!db || unsubUsuarios) return
    const q = query(collection(db, "usuarios"))
    unsubUsuarios = onSnapshot(
      q,
      (snap) => {
        set({ usuarios: snap.docs.map((doc) => mapDoc<Usuario>(doc)), usuariosLoading: false })
      },
      () => set({ usuariosLoading: false })
    )
  },

  initPersonas: () => {
    if (!db || unsubPersonas) return
    const q = query(collection(db, "personas"))
    unsubPersonas = onSnapshot(
      q,
      (snap) => {
        set({ personas: snap.docs.map((doc) => mapDoc<Persona>(doc)), personasLoading: false })
      },
      () => set({ personasLoading: false })
    )
  },

  initNotificaciones: (usuarioId: string) => {
    if (!db || unsubNotificaciones) return
    const q = query(collection(db, "notificaciones"), where("usuarioId", "==", usuarioId))
    unsubNotificaciones = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => mapDoc<Notificacion>(doc))
        data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        set({
          notificaciones: data,
          noLeidas: data.filter((n) => !n.leido).length,
          notificacionesLoading: false,
        })
      },
      () => set({ notificacionesLoading: false })
    )
  },

  initConsultas: (usuarioId: string, rol: string) => {
    if (!db || unsubConsultas) return
    const esPastorOAdmin = rol === "pastor" || rol === "administrador"

    if (esPastorOAdmin) {
      const q = query(collection(db, "consultas"), orderBy("createdAt", "desc"))
      unsubConsultas = onSnapshot(
        q,
        (snap) => {
          const data = snap.docs.map((doc) => mapDoc<Consulta>(doc))
          const noLeidas = data.filter((t) => t.a === usuarioId && !t.leidoPorDestinatario).length
          set({ consultas: data, consultasNoLeidas: noLeidas, consultasLoading: false })
        },
        () => set({ consultasLoading: false })
      )
    } else {
      const qSent = query(collection(db, "consultas"), where("de", "==", usuarioId))
      const qReceived = query(collection(db, "consultas"), where("a", "==", usuarioId))

      let sent: Consulta[] = []
      let received: Consulta[] = []

      const updateCombined = () => {
        const combined = [...sent, ...received].sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        )
        const noLeidas = received.filter((t) => !t.leidoPorDestinatario).length
        set({ consultas: combined, consultasNoLeidas: noLeidas, consultasLoading: false })
      }

      const unsubSent = onSnapshot(qSent, (snap) => {
        sent = snap.docs.map((doc) => mapDoc<Consulta>(doc))
        updateCombined()
      })

      const unsubReceived = onSnapshot(qReceived, (snap) => {
        received = snap.docs.map((doc) => mapDoc<Consulta>(doc))
        updateCombined()
      })

      unsubConsultas = () => {
        unsubSent()
        unsubReceived()
      }
    }
  },

  cleanup: () => {
    if (unsubMinisterios) { unsubMinisterios(); unsubMinisterios = null }
    if (unsubRamas) { unsubRamas(); unsubRamas = null }
    if (unsubUsuarios) { unsubUsuarios(); unsubUsuarios = null }
    if (unsubPersonas) { unsubPersonas(); unsubPersonas = null }
    if (unsubNotificaciones) { unsubNotificaciones(); unsubNotificaciones = null }
    if (unsubConsultas) { unsubConsultas(); unsubConsultas = null }
  },

  refreshAll: (usuarioId, rol) => {
    if (unsubMinisterios) { unsubMinisterios(); unsubMinisterios = null }
    if (unsubRamas) { unsubRamas(); unsubRamas = null }
    if (unsubUsuarios) { unsubUsuarios(); unsubUsuarios = null }
    if (unsubPersonas) { unsubPersonas(); unsubPersonas = null }
    if (unsubNotificaciones) { unsubNotificaciones(); unsubNotificaciones = null }
    if (unsubConsultas) { unsubConsultas(); unsubConsultas = null }
    get().initMinisterios()
    get().initRamas()
    get().initUsuarios()
    get().initPersonas()
    get().initNotificaciones(usuarioId)
    get().initConsultas(usuarioId, rol)
  },

  setMinisterios: (ministeriosOrFn) => {
    const prev = get().ministerios
    const ministerios = typeof ministeriosOrFn === "function" ? ministeriosOrFn(prev) : ministeriosOrFn
    set({ ministerios })
  },

  setRamas: (ramasOrFn) => {
    const prev = get().ramas
    const ramas = typeof ramasOrFn === "function" ? ramasOrFn(prev) : ramasOrFn
    set({ ramas })
  },

  setUsuarios: (usuariosOrFn) => {
    const prev = get().usuarios
    const usuarios = typeof usuariosOrFn === "function" ? usuariosOrFn(prev) : usuariosOrFn
    set({ usuarios })
  },

  setPersonas: (personasOrFn) => {
    const prev = get().personas
    const personas = typeof personasOrFn === "function" ? personasOrFn(prev) : personasOrFn
    set({ personas })
  },

  setNotificaciones: (notifsOrFn) => {
    const prev = get().notificaciones
    const notifs = typeof notifsOrFn === "function" ? notifsOrFn(prev) : notifsOrFn
    set({ notificaciones: notifs, noLeidas: notifs.filter((n) => !n.leido).length })
  },
  setConsultas: (consultas: Consulta[]) => set({ consultas }),
}))
