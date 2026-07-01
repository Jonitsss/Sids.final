import { describe, it, expect } from 'vitest'
import {
  puedeBorrar,
  tieneAccesoTotal,
  puedeGestionarUsuarios,
  puedeAdministrarMinisterio,
  puedeAdministrarCelula,
  puedeAdministrarEscuela,
  puedeCrearEventos,
  puedeVerReportes,
  puedeModificarAsistencia,
  puedeEliminarCelulas,
  puedeCrearCelulas,
  esLiderDeArea,
} from './permissions'
import type { Administer } from '@/types'

const administerVacio: Administer = {}
const administerConMinisterio: Administer = { ministerios: ['min-1', 'min-2'] }
const administerConCelula: Administer = { celulas: ['cel-1'] }
const administerConEscuela: Administer = { escuelas: ['esc-1'] }
const administerConTodo: Administer = {
  ministerios: ['min-1'],
  celulas: ['cel-1'],
  escuelas: ['esc-1'],
}

describe('puedeBorrar', () => {
  it('pastor y administrador pueden borrar', () => {
    expect(puedeBorrar('pastor')).toBe(true)
    expect(puedeBorrar('administrador')).toBe(true)
  })

  it('otros roles no pueden borrar', () => {
    expect(puedeBorrar('lider')).toBe(false)
    expect(puedeBorrar('colaborador')).toBe(false)
  })
})

describe('tieneAccesoTotal', () => {
  it('pastor y administrador tienen acceso total', () => {
    expect(tieneAccesoTotal('pastor')).toBe(true)
    expect(tieneAccesoTotal('administrador')).toBe(true)
  })

  it('otros roles no tienen acceso total', () => {
    expect(tieneAccesoTotal('lider')).toBe(false)
    expect(tieneAccesoTotal('colaborador')).toBe(false)
  })
})

describe('puedeAdministrarMinisterio', () => {
  it('administer con ministerios puede administrar ese ministerio', () => {
    expect(puedeAdministrarMinisterio(administerConMinisterio, 'min-1')).toBe(true)
    expect(puedeAdministrarMinisterio(administerConMinisterio, 'min-2')).toBe(true)
  })

  it('administer sin ese ministerio no puede', () => {
    expect(puedeAdministrarMinisterio(administerConMinisterio, 'min-3')).toBe(false)
  })

  it('administer vacío no puede administrar ningún ministerio', () => {
    expect(puedeAdministrarMinisterio(administerVacio, 'min-1')).toBe(false)
  })

  it('null o undefined no puede', () => {
    expect(puedeAdministrarMinisterio(null, 'min-1')).toBe(false)
    expect(puedeAdministrarMinisterio(undefined, 'min-1')).toBe(false)
  })
})

describe('puedeAdministrarCelula', () => {
  it('administer con celulas puede administrar esa célula', () => {
    expect(puedeAdministrarCelula(administerConCelula, 'cel-1')).toBe(true)
  })

  it('administer sin esa célula no puede', () => {
    expect(puedeAdministrarCelula(administerConCelula, 'cel-2')).toBe(false)
  })
})

describe('puedeAdministrarEscuela', () => {
  it('administer con escuelas puede administrar esa escuela', () => {
    expect(puedeAdministrarEscuela(administerConEscuela, 'esc-1')).toBe(true)
  })

  it('administer sin esa escuela no puede', () => {
    expect(puedeAdministrarEscuela(administerConEscuela, 'esc-2')).toBe(false)
  })
})

describe('puedeCrearEventos', () => {
  it('administer con ministerios puede crear eventos', () => {
    expect(puedeCrearEventos(administerConMinisterio)).toBe(true)
  })

  it('administer vacío no puede crear eventos', () => {
    expect(puedeCrearEventos(administerVacio)).toBe(false)
  })

  it('null o undefined no puede', () => {
    expect(puedeCrearEventos(null)).toBe(false)
    expect(puedeCrearEventos(undefined)).toBe(false)
  })
})

describe('puedeGestionarUsuarios', () => {
  it('pastor y administrador pueden gestionar usuarios', () => {
    expect(puedeGestionarUsuarios('pastor')).toBe(true)
    expect(puedeGestionarUsuarios('administrador')).toBe(true)
  })

  it('otros roles no pueden gestionar usuarios', () => {
    expect(puedeGestionarUsuarios('lider')).toBe(false)
    expect(puedeGestionarUsuarios('colaborador')).toBe(false)
  })
})

describe('puedeVerReportes', () => {
  it('pastor y admin pueden ver reportes siempre', () => {
    expect(puedeVerReportes('pastor')).toBe(true)
    expect(puedeVerReportes('administrador')).toBe(true)
  })

  it('administer con ministerios puede ver reportes', () => {
    expect(puedeVerReportes('lider', administerConMinisterio)).toBe(true)
  })

  it('administer vacío no puede ver reportes', () => {
    expect(puedeVerReportes('lider', administerVacio)).toBe(false)
  })
})

describe('puedeModificarAsistencia', () => {
  it('pastor y admin pueden modificar asistencia siempre', () => {
    expect(puedeModificarAsistencia('pastor')).toBe(true)
    expect(puedeModificarAsistencia('administrador')).toBe(true)
  })

  it('administer con ministerios o celulas puede modificar asistencia', () => {
    expect(puedeModificarAsistencia('lider', administerConMinisterio)).toBe(true)
    expect(puedeModificarAsistencia('lider', administerConCelula)).toBe(true)
    expect(puedeModificarAsistencia('lider', administerConTodo)).toBe(true)
  })

  it('administer vacío sin rol elevado no puede', () => {
    expect(puedeModificarAsistencia('lider', administerVacio)).toBe(false)
    expect(puedeModificarAsistencia('colaborador')).toBe(false)
  })
})

describe('puedeEliminarCelulas', () => {
  it('pastor y administrador pueden eliminar células', () => {
    expect(puedeEliminarCelulas('pastor')).toBe(true)
    expect(puedeEliminarCelulas('administrador')).toBe(true)
  })

  it('otros roles no pueden eliminar células', () => {
    expect(puedeEliminarCelulas('lider')).toBe(false)
    expect(puedeEliminarCelulas('colaborador')).toBe(false)
  })
})

describe('puedeCrearCelulas', () => {
  it('administer con celulas puede crear células', () => {
    expect(puedeCrearCelulas(administerConCelula)).toBe(true)
    expect(puedeCrearCelulas(administerConTodo)).toBe(true)
  })

  it('administer vacío no puede crear células', () => {
    expect(puedeCrearCelulas(administerVacio)).toBe(false)
  })

  it('null o undefined no puede', () => {
    expect(puedeCrearCelulas(null)).toBe(false)
    expect(puedeCrearCelulas(undefined)).toBe(false)
  })
})

describe('esLiderDeArea', () => {
  it('lider y lider_area son líderes de área', () => {
    expect(esLiderDeArea('lider')).toBe(true)
    expect(esLiderDeArea('lider_area')).toBe(true)
  })

  it('otros roles no son líderes de área', () => {
    expect(esLiderDeArea('pastor')).toBe(false)
    expect(esLiderDeArea('administrador')).toBe(false)
    expect(esLiderDeArea('lider_celula')).toBe(false)
    expect(esLiderDeArea('colaborador')).toBe(false)
  })
})
