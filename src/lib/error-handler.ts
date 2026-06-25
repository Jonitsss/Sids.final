import { FirebaseError } from 'firebase/app'
import { logger } from './logger'

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const handleFirestoreError = (error: unknown, context: string): AppError => {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof FirebaseError) {
    logger.error(`Firebase error in ${context}`, error, { code: error.code })

    switch (error.code) {
      case 'permission-denied':
        return new AppError(
          'PERMISSION_DENIED',
          'No tenés permisos para realizar esta acción',
          403
        )
      case 'not-found':
        return new AppError(
          'NOT_FOUND',
          'El documento no fue encontrado',
          404
        )
      case 'unauthenticated':
        return new AppError(
          'UNAUTHENTICATED',
          'Debés estar autenticado',
          401
        )
      case 'invalid-argument':
        return new AppError(
          'INVALID_ARGUMENT',
          'Los datos proporcionados son inválidos',
          400
        )
      case 'already-exists':
        return new AppError(
          'ALREADY_EXISTS',
          'El documento ya existe',
          409
        )
      case 'resource-exhausted':
        return new AppError(
          'RESOURCE_EXHAUSTED',
          'Se alcanzó el límite de operaciones',
          429
        )
      case 'cancelled':
        return new AppError(
          'CANCELLED',
          'La operación fue cancelada',
          499
        )
      case 'unavailable':
        return new AppError(
          'UNAVAILABLE',
          'El servicio no está disponible. Intentá de nuevo en unos segundos.',
          503
        )
      case 'deadline-exceeded':
        return new AppError(
          'DEADLINE_EXCEEDED',
          'La operación tardó demasiado tiempo',
          504
        )
      default:
        return new AppError(
          context,
          `Error en Firestore: ${error.message}`,
          500,
          { originalCode: error.code }
        )
    }
  }

  if (error instanceof Error) {
    logger.error(`Unexpected error in ${context}`, error)
    return new AppError(
      context,
      error.message,
      500
    )
  }

  logger.error(`Unknown error in ${context}`, new Error(String(error)))
  return new AppError(
    context,
    'Ha ocurrido un error desconocido',
    500
  )
}
