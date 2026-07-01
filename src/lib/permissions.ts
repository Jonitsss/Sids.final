import { Administer } from '@/types'

export function tieneAccesoTotal(rol: string): boolean {
  return rol === 'pastor' || rol === 'administrador'
}

export function puedeBorrar(rol: string): boolean {
  return rol === 'pastor' || rol === 'administrador'
}

export function puedeGestionarUsuarios(rol: string): boolean {
  return rol === 'pastor' || rol === 'administrador'
}

export function puedeAdministrarMinisterio(
  administer: Administer | undefined | null,
  ministerioId: string,
): boolean {
  return administer?.ministerios?.includes(ministerioId) ?? false
}

export function puedeAdministrarCelula(administer: Administer | undefined | null, celulaId: string): boolean {
  return administer?.celulas?.includes(celulaId) ?? false
}

export function puedeAdministrarEscuela(administer: Administer | undefined | null, escuelaId: string): boolean {
  return administer?.escuelas?.includes(escuelaId) ?? false
}

export function puedeCrearEventos(administer: Administer | undefined | null): boolean {
  return (administer?.ministerios?.length ?? 0) > 0
}

export function puedeVerReportes(rol: string, administer?: Administer | null): boolean {
  return tieneAccesoTotal(rol) || (administer?.ministerios?.length ?? 0) > 0
}

export function puedeModificarAsistencia(rol: string, administer?: Administer | null): boolean {
  return tieneAccesoTotal(rol) || (administer?.ministerios?.length ?? 0) > 0 || (administer?.celulas?.length ?? 0) > 0
}

export function puedeEliminarCelulas(rol: string): boolean {
  return tieneAccesoTotal(rol)
}

export function puedeCrearCelulas(administer: Administer | undefined | null): boolean {
  return (administer?.celulas?.length ?? 0) > 0
}

export function esLiderDeArea(rol: string): boolean {
  return rol === 'lider' || rol === 'lider_area'
}
