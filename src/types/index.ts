export type Rol = "pastor" | "lider" | "colaborador"

export type EstadoAsignacion = "pendiente" | "confirmado" | "rechazado"

export type EstadoTarea = "pendiente" | "en_progreso" | "completada"

export type EstadoAsistencia = "presente" | "ausente" | "justificado"

export type TipoEvento = "reunion_general" | "ensayo" | "jovenes" | "escuela_biblica" | "evento_especial"

export type TipoRecurrencia = "semanal" | "quincenal" | "mensual" | "unico"

export interface Usuario {
  id: string
  email: string
  nombre: string
  apellido: string
  telefono: string
  rol: Rol
  ministerioIds: string[]
  fotoURL: string
  authUid?: string
  notificaciones: boolean
  activo: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Ministerio {
  id: string
  slug: string
  nombre: string
  descripcion: string
  liderId: string
  roles: string[]
  color: string
  icono: string
  activo: boolean
  createdAt: Date
}

export interface Evento {
  id: string
  titulo: string
  descripcion: string
  fecha: Date
  horaInicio: string
  horaFin: string
  tipo: TipoEvento
  recurrencia: TipoRecurrencia
  esRecurrente: boolean
  suspendido: boolean
  ubicacion: string
  ministerioIds: string[]
  creadoPor: string
  createdAt: Date
}

export interface GrillaServicio {
  id: string
  eventoId: string
  fecha: Date
  asignaciones: Asignacion[]
  notas: string
  createdAt: Date
  updatedAt: Date
}

export interface Asignacion {
  ministerioId: string
  rol: string
  usuarioId: string
  estado: EstadoAsignacion
  esExterno: boolean
  nombreExterno: string
}

export interface Tarea {
  id: string
  titulo: string
  descripcion: string
  responsableId: string
  ministerioId: string
  eventoId: string
  fechaLimite: Date
  estado: EstadoTarea
  creadoPor: string
  createdAt: Date
  updatedAt: Date
}

export interface Asistencia {
  id: string
  eventoId: string
  usuarioId: string
  estado: EstadoAsistencia
  justificacion: string
  fecha: Date
  registradoPor: string
  createdAt: Date
}

export interface Notificacion {
  id: string
  usuarioId: string
  titulo: string
  mensaje: string
  leido: boolean
  tipo: "asignacion" | "tarea" | "evento" | "confirmacion" | "ministerio"
  referenciaId: string
  createdAt: Date
}

export interface MiembroMinisterio {
  id: string
  usuarioId: string
  ministerioId: string
  roles: string[]
  fechaIngreso: Date
  activo: boolean
}

export type DashboardStats = {
  proximosEventos: Evento[]
  tareasPendientes: number
  colaboradoresBajaAsistencia: number
  confirmacionesPendientes: number
  asistenciaMensual: { presente: number; ausente: number; justificado: number }
  miembrosPorMinisterio: { ministerio: string; cantidad: number }[]
}
