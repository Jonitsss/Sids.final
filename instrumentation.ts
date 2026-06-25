import * as Sentry from "@sentry/nextjs"
import type { NextRequest } from "next/server"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      enabled: process.env.NODE_ENV === "production",
      environment: process.env.NODE_ENV,
    })
  }
}

export function onRequestError(
  error: Error & { digest?: string },
  _request: NextRequest,
  _context: { routerKind: string; routePath: string; routeType: string }
) {
  Sentry.captureException(error)
}
