export type Rol =
  | "pastor"
  | "administrador"
  | "lider"
  | "lider_area"
  | "lider_celula"
  | "colider"
  | "anfitrion"
  | "maestra_escuela_biblica"
  | "profesor_escuela_min"
  | "colaborador"

export type EstadoAsignacion = "pendiente" | "confirmado" | "rechazado"

export type EstadoTarea = "pendiente" | "en_progreso" | "completada"

export type EstadoAsistencia = "presente" | "ausente" | "justificado"

export type TipoEvento = "reunion_general" | "reunion_coordinacion" | "ensayo" | "jovenes" | "escuela_biblica" | "evento_especial"

export type TipoRecurrencia = "semanal" | "quincenal" | "mensual" | "unico"

export interface Usuario {
  id: string
  email: string
  nombre: string
  apellido: string
  telefono: string
  rol: Rol
  ministerioIds: string[]
  rolesMinisterios?: {
    ministerioId: string
    rol: string
  }[]
  celularRamaId?: string
  celulaIds?: string[]
  escuelaMinisteriosIds?: string[]
  multimedia?: {
    roles: string[]
  }
  sonido?: {
    roles: string[]
    esAyudante: boolean
  }
  fotoURL: string
  authUid?: string
  notificaciones: boolean
  activo: boolean
  fcmTokens?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Ministerio {
  id: string
  slug: string
  nombre: string
  descripcion: string
  encargados: string[]
  tipo?: 'alabanza' | 'diaconos' | 'celular' | 'escuela_biblica' | 'multimedia' | 'sonido' | 'escuela_ministerios'
  roles: string[]
  color: string
  icono: string
  activo: boolean
  rolesFlexibles?: {
    nombre: string
    cantidad: number | 'flexible'
    usuarioIds: string[]
  }[]
  ramasCelulares?: {
    ramaId: string
    encargadoId: string
  }[]
  createdAt: Date
  updatedAt?: Date
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
  justificacionRechazo?: string
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
  tipo: "asignacion" | "tarea" | "evento" | "confirmacion" | "ministerio" | "rol" | "aprobacion" | "registro"
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

export type TipoCelula =
  | "mujeres"
  | "hombres"
  | "adolescentes_varones"
  | "adolescentes_mujeres"
  | "matrimonios"

export interface Consulta {
  id: string
  de: string
  deNombre: string
  a: string
  aNombre: string
  asunto: string
  mensaje: string
  estado: "pendiente" | "respondido" | "cerrado"
  respuesta: string
  tipo: "sugerencia" | "tema" | "consulta" | "urgente"
  leidoPorDestinatario: boolean
  leidoPorRemitente: boolean
  createdAt: Date
  updatedAt: Date
}

export interface RamaCelular {
  id: string
  nombre: string
  tipo: TipoCelula
  encargadoId?: string
  descripcion?: string
  ministerioId?: string
  activo: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Celula {
  id: string
  nombre: string
  tipo: TipoCelula
  ramaId?: string
  direccion: string
  liderId: string
  coliderId: string
  anfitrionId: string
  dia: string
  hora: string
  ministerioId?: string
  activo: boolean
  createdAt: Date
}

export type EstadoMiembroCelula = "activo" | "inactivo" | "visitante" | "nuevo" | "en_consolidacion" | "bautizado"

export interface MiembroCelula {
  id: string
  celulaId: string
  personaId?: string
  nombre: string
  estado: EstadoMiembroCelula
  fechaIngreso?: Date
  fechaSalida?: Date
  motivoSalida?: string
  activo: boolean
  createdAt: Date
}

export interface AsistenciaReporteCelula {
  personaId?: string
  nombre: string
  estado: "presente" | "ausente"
}

export interface ReporteCelula {
  id: string
  celulaId: string
  semana: string
  fecha: Date
  liderId: string
  asistencia: AsistenciaReporteCelula[]
  totalMiembros: number
  asistentes: number
  ausentes: number
  invitados: number
  temaTratado: string
  versiculoPrincipal: string
  ofrenda: number
  observaciones: string
  recibio: string
  supervisado?: string
  createdBy: string
  activo: boolean
  createdAt: Date
}

export type DashboardStats = {
  proximosEventos: Evento[]
  tareasPendientes: number
  colaboradoresBajaAsistencia: number
  confirmacionesPendientes: number
  asistenciaMensual: { presente: number; ausente: number; justificado: number }
  miembrosPorMinisterio: { ministerio: string; cantidad: number }[]
}

export type EstadoPersona = "visitante" | "nuevo" | "en_consolidacion" | "miembro" | "bautizado" | "inactivo"

export type TipoHistorial = "ministerio" | "celula" | "escuela" | "bautismo" | "rol" | "evento" | "servicio" | "membresia" | "presentacion_nino" | "visita_pastoral" | "consejeria" | "discipulado"

export interface Persona {
  id: string
  nombre: string
  apellido: string
  email?: string
  telefono?: string
  fechaNacimiento?: Date
  estado: EstadoPersona
  fotoURL?: string
  direccion?: string
  familia?: string[]
  notas?: string
  usuarioId?: string
  tieneUsuario?: boolean
  ministeriosActuales?: {
    ministerioId: string
    nombre: string
    rol: string
  }[]
  celulaActual?: {
    celulaId: string
    nombre: string
    rol: string
  }
  escuelaMinisterioActual?: {
    escuelaId: string
    nivel: string
    estado: 'cursando' | 'completado' | 'abandonado'
  }
  createdAt: Date
  updatedAt: Date
}

export interface AsignacionMinisterio {
  id: string
  personaId: string
  ministerioId: string
  roles: string[]
  fechaInicio: Date
  fechaFin?: Date
  activo: boolean
  createdAt: Date
  updatedAt: Date
}

export interface HistorialPersona {
  id: string
  personaId: string
  tipo: TipoHistorial
  titulo: string
  descripcion?: string
  referenciaId?: string
  fechaInicio: Date
  fechaFin?: Date
  createdAt: Date
}

export interface GrupoEscuelaBiblica {
  id: string
  nombre: string
  maestraId: string
  ayudantes: string[]
  temaActual?: string
  activo: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AsistenciaEscuelaBiblica {
  id: string
  grupoId: string
  personaId: string
  fecha: Date
  asistio: boolean
  createdAt: Date
}

// ============================================
// ESCUELA DE MINISTERIOS
// ============================================

export interface EscuelaMinisterios {
  id: string
  nombre: 'consolidacion' | 'nivel1' | 'nivel2' | 'nivel3' | 'teologia'
  encargadoId: string
  profesores: {
    usuarioId: string
    nombre: string
  }[]
  material: MaterialEM[]
  createdAt: Date
  updatedAt: Date
}

export interface MaterialEM {
  id?: string
  titulo: string
  descripcion: string
  url?: string
  tipo?: 'pdf' | 'link' | 'documento' | 'video'
  fechaPublicacion?: Date
}

export interface AsistenciaEM {
  id: string
  escuelaId: string
  usuarioId: string
  fecha: Date
  asistio: boolean
  createdAt: Date
}

export interface NotaEM {
  id: string
  escuelaId: string
  usuarioId: string
  nota: number
  periodo: string
  comentarios?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================
// MIEMBROS DE IGLESIA (fusionado en Persona)
// ============================================
// Deprecado: usar Persona con los campos extendidos
// ministeriosActuales, celulaActual, escuelaMinisterioActual

// ============================================
// MULTIMEDIA y SONIDO
// ============================================

export interface MultimediaRol {
  id: string
  ministerioId: string
  rol: 'proyecciones' | 'fotografia' | 'video'
  usuarioIds: string[]
}

export interface SonidoRol {
  id: string
  ministerioId: string
  rol: 'pa' | 'stream' | 'monitores'
  usuarioIds: string[]
  ayudantes: string[]
}
