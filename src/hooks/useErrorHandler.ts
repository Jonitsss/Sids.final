"use client"

import { useCallback } from "react"
import { toast } from "sonner"
import { AppError, handleFirestoreError } from "@/lib/error-handler"
import { logger } from "@/lib/logger"

export const useErrorHandler = () => {
  const handleError = useCallback((error: unknown, context: string = "error") => {
    const appError = error instanceof AppError ? error : handleFirestoreError(error, context)

    toast.error(appError.message)

    logger.error(`User-facing error: ${appError.code}`, appError, {
      statusCode: appError.statusCode,
      details: appError.details,
      context,
    })

    return appError
  }, [])

  return { handleError }
}
