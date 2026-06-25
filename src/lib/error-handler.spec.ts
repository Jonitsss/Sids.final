import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppError, handleFirestoreError } from './error-handler'

vi.mock('./logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('AppError', () => {
  it('crea error con valores por defecto', () => {
    const error = new AppError('TEST', 'Mensaje de prueba')
    expect(error.code).toBe('TEST')
    expect(error.message).toBe('Mensaje de prueba')
    expect(error.statusCode).toBe(500)
    expect(error.name).toBe('AppError')
    expect(error.details).toBeUndefined()
  })

  it('crea error con statusCode y details', () => {
    const details = { field: 'email' }
    const error = new AppError('VALIDATION', 'Email inválido', 400, details)
    expect(error.statusCode).toBe(400)
    expect(error.details).toEqual(details)
  })
})

describe('handleFirestoreError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna AppError si ya es AppError', () => {
    const original = new AppError('EXISTING', 'Ya existe', 409)
    const result = handleFirestoreError(original, 'test')
    expect(result).toBe(original)
  })

  it('maneja Error genérico', () => {
    const error = new Error('Error genérico')
    const result = handleFirestoreError(error, 'test')
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe('Error genérico')
    expect(result.statusCode).toBe(500)
  })

  it('maneja error desconocido (string)', () => {
    const result = handleFirestoreError('error string', 'test')
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe('Ha ocurrido un error desconocido')
    expect(result.statusCode).toBe(500)
  })

  it('maneja error null', () => {
    const result = handleFirestoreError(null, 'test')
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe('Ha ocurrido un error desconocido')
  })

  it('maneja error undefined', () => {
    const result = handleFirestoreError(undefined, 'test')
    expect(result).toBeInstanceOf(AppError)
    expect(result.message).toBe('Ha ocurrido un error desconocido')
  })
})
