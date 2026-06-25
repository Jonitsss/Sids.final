import { toast } from "sonner"
import { logger } from "./logger"

export const showError = (message: string, error?: unknown) => {
  toast.error(message)
  if (error) {
    logger.error(message, error instanceof Error ? error : undefined)
  }
}

export const showSuccess = (message: string) => {
  toast.success(message)
}
