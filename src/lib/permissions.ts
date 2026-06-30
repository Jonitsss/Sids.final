import { Rol } from '@/types'

const ROLES_DESTRUCTIVOS: Rol[] = ['pastor', 'administrador']

const ROLES_CON_ACCESO_TOTAL: Rol[] = ['pastor', 'administrador']

export function puedeBorrar(rol: Rol): boolean {
  return ROLES_DESTRUCTIVOS.includes(rol)
}

export function tieneAccesoTotal(rol: Rol): boolean {
  return ROLES_CON_ACCESO_TOTAL.includes(rol)
}

export function esLider(rol: Rol): boolean {
  return ['lider', 'lider_celula'].includes(rol)
}

export function esLiderDeCelula(rol: Rol): boolean {
  return rol === 'lider_celula'
}

export function esColaborador(rol: Rol): boolean {
  return rol === 'colaborador'
}

export function puedeCrearEventos(rol: Rol): boolean {
  return ['pastor', 'administrador', 'lider'].includes(rol)
}

export function puedeGestionarUsuarios(rol: Rol): boolean {
  return ['pastor', 'administrador'].includes(rol)
}

export function puedeVerReportes(rol: Rol): boolean {
  return ['pastor', 'administrador', 'lider'].includes(rol)
}

export function puedeModificarAsistencia(rol: Rol): boolean {
  return ['pastor', 'administrador', 'lider', 'lider_celula'].includes(rol)
}

export function puedeEliminarCelulas(rol: Rol): boolean {
  return ROLES_DESTRUCTIVOS.includes(rol)
}

export function puedeCrearCelulas(rol: Rol): boolean {
  return ['pastor', 'administrador', 'lider_celula'].includes(rol)
}

export function esLiderDeArea(rol: Rol): boolean {
  return rol === 'lider'
}
