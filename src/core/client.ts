import { ofetch, FetchError } from 'ofetch'
import type { $Fetch } from 'ofetch'
import type { ClientOptions } from './types.ts'
import { HTTPError, RateLimitError } from './errors.ts'
import { version } from '../version.ts'

const DEFAULT_MAX_RETRIES = 5
const DEFAULT_BASE_DELAY = 50
const DEFAULT_TIMEOUT = 30_000
const DEFAULT_USER_AGENT = `webxa/${version}`

/** HTTP client with exponential backoff retry and error mapping to webxa error types. */
export class Client {
  readonly maxRetries: number
  readonly baseDelay: number
  readonly timeout: number
  readonly userAgent: string
  private readonly fetch: $Fetch

  constructor(options: ClientOptions = {}) {
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
    this.baseDelay = options.baseDelay ?? DEFAULT_BASE_DELAY
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT

    const maxRetries = this.maxRetries
    const baseDelay = this.baseDelay

    this.fetch = ofetch.create({
      retry: this.maxRetries,
      retryDelay(context) {
        const remaining = typeof context.options.retry === 'number' ? context.options.retry : 0
        const attempt = maxRetries - remaining
        const delay = baseDelay * Math.pow(2, attempt - 1)
        const jitter = delay * Math.random() * 0.1
        return delay + jitter
      },
      retryStatusCodes: [408, 429, 500, 502, 503, 504],
      timeout: this.timeout,
      headers: {
        'Accept': 'application/json',
        'User-Agent': this.userAgent,
      },
    })
  }

  /** Send a GET request and parse the JSON response. */
  async getJSON<T>(url: string, headers?: Record<string, string>, signal?: AbortSignal): Promise<T> {
    try {
      return await this.fetch<T>(url, { headers, signal })
    }
    catch (error) {
      throw this.mapError(error, url)
    }
  }

  /** Send a POST request with a JSON body and parse the JSON response. */
  async postJSON<T>(
    url: string,
    body: Record<string, unknown>,
    headers?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<T> {
    try {
      return await this.fetch<T>(url, {
        method: 'POST',
        body,
        headers,
        signal,
      })
    }
    catch (error) {
      throw this.mapError(error, url)
    }
  }

  private mapError(error: unknown, url: string): Error {
    if (error instanceof FetchError) {
      if (error.statusCode === 429) {
        const retryAfter = Number.parseInt(
          error.response?.headers.get('Retry-After') ?? '60',
          10,
        )
        throw new RateLimitError(retryAfter)
      }

      const body = typeof error.data === 'string'
        ? error.data
        : JSON.stringify(error.data ?? '')

      throw new HTTPError(error.statusCode ?? 0, sanitizeUrl(url), body)
    }
    return error instanceof Error ? error : new Error(String(error))
  }
}

const SENSITIVE_PARAMS = ['api_key', 'key', 'token', 'secret', 'password', 'apikey']
const SENSITIVE_PARAM_SET = new Set(SENSITIVE_PARAMS.map(param => param.toLowerCase()))

function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const redactedParams = new URLSearchParams()

    for (const [key, value] of parsed.searchParams.entries()) {
      if (SENSITIVE_PARAM_SET.has(key.toLowerCase())) {
        redactedParams.append(key, '[REDACTED]')
        continue
      }

      redactedParams.append(key, value)
    }

    parsed.search = redactedParams.toString()
    return parsed.toString()
  }
  catch {
    return url
  }
}

let _defaultClient: Client | undefined

/** Lazily-initialized singleton {@link Client} used by all providers. */
export function defaultClient(): Client {
  if (!_defaultClient) {
    _defaultClient = new Client()
  }
  return _defaultClient
}
