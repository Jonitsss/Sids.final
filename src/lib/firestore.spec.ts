import { describe, it, expect } from 'vitest'
import { mapDoc } from './firestore'
import { slugify, rolLabel, cn } from './utils'

describe('mapDoc', () => {
  it('mapea documento básico con id', () => {
    const doc = {
      id: 'abc123',
      data: () => ({
        nombre: 'Test',
        email: 'test@test.com',
      }),
    }
    const result = mapDoc(doc)
    expect(result).toEqual({
      id: 'abc123',
      nombre: 'Test',
      email: 'test@test.com',
    })
  })

  it('convierte Timestamp de Firestore a Date', () => {
    const timestamp = { toDate: () => new Date('2024-01-15') }
    const doc = {
      id: 'doc1',
      data: () => ({
        fecha: timestamp,
        createdAt: timestamp,
      }),
    }
    const result = mapDoc(doc)
    expect(result.fecha).toBeInstanceOf(Date)
    expect(result.createdAt).toBeInstanceOf(Date)
  })

  it('mantiene fechas que ya son Date', () => {
    const date = new Date('2024-06-01')
    const doc = {
      id: 'doc2',
      data: () => ({
        fecha: date,
      }),
    }
    const result = mapDoc(doc)
    expect(result.fecha).toBe(date)
  })

  it('mantiene fechas que son string', () => {
    const doc = {
      id: 'doc3',
      data: () => ({
        fecha: '2024-06-01',
      }),
    }
    const result = mapDoc(doc)
    expect(result.fecha).toBe('2024-06-01')
  })
})

describe('slugify', () => {
  it('convierte texto a slug', () => {
    expect(slugify('Hola Mundo')).toBe('hola-mundo')
  })

  it('elimina acentos', () => {
    expect(slugify('Ministerio de Jóvenes')).toBe('ministerio-de-jovenes')
  })

  it('maneja múltiples espacios', () => {
    expect(slugify('  Hola   Mundo  ')).toBe('hola-mundo')
  })

  it('elimina caracteres especiales', () => {
    expect(slugify('¡Hola! ¿Cómo estás?')).toBe('hola-como-estas')
  })
})

describe('rolLabel', () => {
  it('retorna label legible para cada rol', () => {
    expect(rolLabel('pastor')).toBe('Pastor')
    expect(rolLabel('administrador')).toBe('Administrador')
    expect(rolLabel('lider')).toBe('Líder de área')
    expect(rolLabel('lider_celula')).toBe('Líder de célula')
    expect(rolLabel('colider')).toBe('Colíder')
    expect(rolLabel('anfitrion')).toBe('Anfitrión')
    expect(rolLabel('colaborador')).toBe('Colaborador')
  })

  it('retorna string vacío para rol undefined', () => {
    expect(rolLabel(undefined)).toBe('')
  })

  it('retorna el rol si no está en el mapa', () => {
    expect(rolLabel('rol_fantasma')).toBe('rol_fantasma')
  })
})

describe('cn', () => {
  it('mergea clases de Tailwind', () => {
    const result = cn('text-red-500', 'text-blue-500')
    expect(result).toBe('text-blue-500')
  })

  it('maneja clases condicionales', () => {
    const result = cn('base', false && 'hidden', 'extra')
    expect(result).toContain('base')
    expect(result).toContain('extra')
    expect(result).not.toContain('hidden')
  })
})
