import { describe, it, expect } from 'vitest'
import {
  puedeBorrar,
  tieneAccesoTotal,
  esLider,
  esLiderDeCelula,
  esColaborador,
  puedeCrearEventos,
  puedeGestionarUsuarios,
  puedeVerReportes,
  puedeModificarAsistencia,
  puedeEliminarCelulas,
  puedeCrearCelulas,
} from './permissions'
import { Rol } from '@/types'

const TODOS_LOS_ROLES: Rol[] = [
  'pastor',
  'administrador',
  'lider',
  'lider_celula',
  'colider',
  'anfitrion',
  'colaborador',
]

describe('puedeBorrar', () => {
  it('pastor y administrador pueden borrar', () => {
    expect(puedeBorrar('pastor')).toBe(true)
    expect(puedeBorrar('administrador')).toBe(true)
  })

  it('otros roles no pueden borrar', () => {
    expect(puedeBorrar('lider')).toBe(false)
    expect(puedeBorrar('lider_celula')).toBe(false)
    expect(puedeBorrar('colider')).toBe(false)
    expect(puedeBorrar('anfitrion')).toBe(false)
    expect(puedeBorrar('colaborador')).toBe(false)
  })
})

describe('tieneAccesoTotal', () => {
  it('pastor y administrador tienen acceso total', () => {
    expect(tieneAccesoTotal('pastor')).toBe(true)
    expect(tieneAccesoTotal('administrador')).toBe(true)
  })

  it('otros roles no tienen acceso total', () => {
    const rolesNoAdmin = TODOS_LOS_ROLES.filter(r => r !== 'pastor' && r !== 'administrador')
    rolesNoAdmin.forEach(rol => {
      expect(tieneAccesoTotal(rol)).toBe(false)
    })
  })
})

describe('esLider', () => {
  it('lider y lider_celula son líderes', () => {
    expect(esLider('lider')).toBe(true)
    expect(esLider('lider_celula')).toBe(true)
  })

  it('otros roles no son líderes', () => {
    expect(esLider('pastor')).toBe(false)
    expect(esLider('administrador')).toBe(false)
    expect(esLider('colider')).toBe(false)
    expect(esLider('anfitrion')).toBe(false)
    expect(esLider('colaborador')).toBe(false)
  })
})

describe('esLiderDeCelula', () => {
  it('solo lider_celula es líder de célula', () => {
    expect(esLiderDeCelula('lider_celula')).toBe(true)
  })

  it('otros roles no son líder de célula', () => {
    TODOS_LOS_ROLES.filter(r => r !== 'lider_celula').forEach(rol => {
      expect(esLiderDeCelula(rol)).toBe(false)
    })
  })
})

describe('esColaborador', () => {
  it('solo colaborador es colaborador', () => {
    expect(esColaborador('colaborador')).toBe(true)
  })

  it('otros roles no son colaboradores', () => {
    TODOS_LOS_ROLES.filter(r => r !== 'colaborador').forEach(rol => {
      expect(esColaborador(rol)).toBe(false)
    })
  })
})

describe('puedeCrearEventos', () => {
  it('pastor, administrador y lider pueden crear eventos', () => {
    expect(puedeCrearEventos('pastor')).toBe(true)
    expect(puedeCrearEventos('administrador')).toBe(true)
    expect(puedeCrearEventos('lider')).toBe(true)
  })

  it('otros roles no pueden crear eventos', () => {
    expect(puedeCrearEventos('lider_celula')).toBe(false)
    expect(puedeCrearEventos('colider')).toBe(false)
    expect(puedeCrearEventos('anfitrion')).toBe(false)
    expect(puedeCrearEventos('colaborador')).toBe(false)
  })
})

describe('puedeGestionarUsuarios', () => {
  it('pastor y administrador pueden gestionar usuarios', () => {
    expect(puedeGestionarUsuarios('pastor')).toBe(true)
    expect(puedeGestionarUsuarios('administrador')).toBe(true)
  })

  it('otros roles no pueden gestionar usuarios', () => {
    const rolesNoAdmin = TODOS_LOS_ROLES.filter(r => r !== 'pastor' && r !== 'administrador')
    rolesNoAdmin.forEach(rol => {
      expect(puedeGestionarUsuarios(rol)).toBe(false)
    })
  })
})

describe('puedeVerReportes', () => {
  it('pastor, administrador y lider pueden ver reportes', () => {
    expect(puedeVerReportes('pastor')).toBe(true)
    expect(puedeVerReportes('administrador')).toBe(true)
    expect(puedeVerReportes('lider')).toBe(true)
  })

  it('otros roles no pueden ver reportes', () => {
    expect(puedeVerReportes('lider_celula')).toBe(false)
    expect(puedeVerReportes('colider')).toBe(false)
    expect(puedeVerReportes('anfitrion')).toBe(false)
    expect(puedeVerReportes('colaborador')).toBe(false)
  })
})

describe('puedeModificarAsistencia', () => {
  it('pastor, administrador, lider y lider_celula pueden modificar asistencia', () => {
    expect(puedeModificarAsistencia('pastor')).toBe(true)
    expect(puedeModificarAsistencia('administrador')).toBe(true)
    expect(puedeModificarAsistencia('lider')).toBe(true)
    expect(puedeModificarAsistencia('lider_celula')).toBe(true)
  })

  it('otros roles no pueden modificar asistencia', () => {
    expect(puedeModificarAsistencia('colider')).toBe(false)
    expect(puedeModificarAsistencia('anfitrion')).toBe(false)
    expect(puedeModificarAsistencia('colaborador')).toBe(false)
  })
})

describe('puedeEliminarCelulas', () => {
  it('pastor y administrador pueden eliminar células', () => {
    expect(puedeEliminarCelulas('pastor')).toBe(true)
    expect(puedeEliminarCelulas('administrador')).toBe(true)
  })

  it('otros roles no pueden eliminar células', () => {
    const rolesNoAdmin = TODOS_LOS_ROLES.filter(r => r !== 'pastor' && r !== 'administrador')
    rolesNoAdmin.forEach(rol => {
      expect(puedeEliminarCelulas(rol)).toBe(false)
    })
  })
})

describe('puedeCrearCelulas', () => {
  it('pastor, administrador y lider_celula pueden crear células', () => {
    expect(puedeCrearCelulas('pastor')).toBe(true)
    expect(puedeCrearCelulas('administrador')).toBe(true)
    expect(puedeCrearCelulas('lider_celula')).toBe(true)
  })

  it('otros roles no pueden crear células', () => {
    expect(puedeCrearCelulas('lider')).toBe(false)
    expect(puedeCrearCelulas('colider')).toBe(false)
    expect(puedeCrearCelulas('anfitrion')).toBe(false)
    expect(puedeCrearCelulas('colaborador')).toBe(false)
  })
})
