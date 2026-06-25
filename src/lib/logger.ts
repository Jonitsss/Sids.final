import * as Sentry from "@sentry/nextjs"

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: Record<string, unknown>
  error?: Error
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development'

  private formatEntry(entry: LogEntry): string {
    const prefix = `[${entry.level.toUpperCase()}]`
    const timestamp = this.isDev ? ` ${entry.timestamp}` : ''
    return `${prefix}${timestamp} ${entry.message}`
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      error,
    }

    if (this.isDev) {
      const formatted = this.formatEntry(entry)

      switch (level) {
        case 'error':
          console.error(formatted, data || '', error || '')
          break
        case 'warn':
          console.warn(formatted, data || '')
          break
        case 'debug':
          console.debug(formatted, data || '')
          break
        default:
          console.log(formatted, data || '')
      }
    }

    if (level === 'error' && error) {
      Sentry.captureException(error, {
        extra: {
          message,
          ...data,
        },
      })
    }
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log('info', message, data)
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log('warn', message, data)
  }

  error(message: string, error?: Error, data?: Record<string, unknown>) {
    this.log('error', message, data, error)
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.log('debug', message, data)
  }
}

export const logger = new Logger()
