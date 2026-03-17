/** Base error for all webxa operations. */
export class WebxaError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'WebxaError'
  }
}

/** Non-auth HTTP error with status code, URL, and response body. */
export class HTTPError extends WebxaError {
  readonly statusCode: number
  readonly url: string
  readonly body: string

  constructor(statusCode: number, url: string, body: string) {
    super(`HTTP ${statusCode}: ${url}`)
    this.name = 'HTTPError'
    this.statusCode = statusCode
    this.url = url
    this.body = body
  }

  isNotFound(): boolean {
    return this.statusCode === 404
  }

  isRateLimit(): boolean {
    return this.statusCode === 429
  }

  isServerError(): boolean {
    return this.statusCode >= 500
  }
}

/** Thrown when a provider rejects the API key (HTTP 401). */
export class AuthError extends WebxaError {
  readonly provider: string

  constructor(message: string, provider: string) {
    super(message)
    this.name = 'AuthError'
    this.provider = provider
  }
}

/** Thrown on HTTP 429. Check {@link retryAfter} for seconds until retry. */
export class RateLimitError extends WebxaError {
  readonly retryAfter: number

  constructor(retryAfter: number) {
    super(`Rate limited. Retry after ${retryAfter}s`)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

/** Thrown when {@link create} is called with an unregistered provider name. */
export class UnknownProviderError extends WebxaError {
  readonly provider: string

  constructor(provider: string) {
    super(`Unknown provider: ${provider}`)
    this.name = 'UnknownProviderError'
    this.provider = provider
  }
}

/** Thrown when no provider can be selected from env or registry. */
export class NoProviderConfiguredError extends WebxaError {
  constructor() {
    super('No web search provider configured. Set an API key env var or register a provider.')
    this.name = 'NoProviderConfiguredError'
  }
}

/**
 * Convert any caught error into a typed {@link WebxaError} subclass.
 * Maps HTTP status codes to specific error types (401 → AuthError, 429 → RateLimitError).
 */
export function normalizeError(error: unknown, provider?: string): WebxaError {
  if (error instanceof HTTPError && error.statusCode === 401) {
    return new AuthError(
      `Authentication failed: ${error.body || 'Invalid or missing API key'}`,
      provider || 'unknown'
    )
  }

  if (error instanceof WebxaError) {
    return error
  }

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    'message' in error
  ) {
    const fetchError = error as { status: number; message: string; response?: { headers?: { get: (key: string) => string | null } } }
    const status = fetchError.status
    const message = fetchError.message || `HTTP ${status}`

    switch (status) {
      case 401:
        return new AuthError(
          `Authentication failed: ${message}`,
          provider || 'unknown'
        )
      case 404:
        return new HTTPError(404, '', message)
      case 429: {
        const retryAfter = parseRetryAfter(fetchError.response?.headers?.get('Retry-After'))
        return new RateLimitError(retryAfter)
      }
      default:
        if (status >= 500) {
          return new HTTPError(status, '', message)
        }
        return new WebxaError(message)
    }
  }

  if (error instanceof Error) {
    return new WebxaError(error.message)
  }

  return new WebxaError(String(error))
}

export const DEFAULT_RETRY_AFTER = 60

export function parseRetryAfter(header: string | null | undefined): number {
  if (header == null) {
    return DEFAULT_RETRY_AFTER
  }

  const trimmed = header.trim()
  if (!/^\d+$/.test(trimmed)) {
    return DEFAULT_RETRY_AFTER
  }

  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_RETRY_AFTER
  }

  return parsed
}
