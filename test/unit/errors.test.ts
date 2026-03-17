import { describe, expect, it } from 'vitest'
import {
  WebxaError,
  HTTPError,
  AuthError,
  RateLimitError,
  UnknownProviderError,
  normalizeError,
  parseRetryAfter,
} from '../../src/core/errors.ts'

describe('WebxaError', () => {
  it('should instantiate with message', () => {
    const error = new WebxaError('Test error')
    expect(error.message).toBe('Test error')
    expect(error.name).toBe('WebxaError')
    expect(error).toBeInstanceOf(Error)
  })

  it('should be instanceof WebxaError', () => {
    const error = new WebxaError('Test')
    expect(error).toBeInstanceOf(WebxaError)
  })
})

describe('HTTPError', () => {
  it('should instantiate with statusCode, url, and body', () => {
    const error = new HTTPError(404, 'https://example.com', 'Not found')
    expect(error.statusCode).toBe(404)
    expect(error.url).toBe('https://example.com')
    expect(error.body).toBe('Not found')
    expect(error).toBeInstanceOf(WebxaError)
  })

  it('should identify 404 as not found', () => {
    const error = new HTTPError(404, 'https://example.com', '')
    expect(error.isNotFound()).toBe(true)
  })

  it('should identify 429 as rate limit', () => {
    const error = new HTTPError(429, 'https://example.com', '')
    expect(error.isRateLimit()).toBe(true)
  })

  it('should identify 500+ as server error', () => {
    const error500 = new HTTPError(500, 'https://example.com', '')
    const error503 = new HTTPError(503, 'https://example.com', '')
    expect(error500.isServerError()).toBe(true)
    expect(error503.isServerError()).toBe(true)
  })

  it('should not identify 400 as server error', () => {
    const error = new HTTPError(400, 'https://example.com', '')
    expect(error.isServerError()).toBe(false)
  })
})

describe('AuthError', () => {
  it('should instantiate with provider field', () => {
    const error = new AuthError('Invalid API key', 'brave')
    expect(error.provider).toBe('brave')
    expect(error.message).toBe('Invalid API key')
    expect(error.name).toBe('AuthError')
    expect(error).toBeInstanceOf(WebxaError)
  })
})

describe('RateLimitError', () => {
  it('should instantiate with retryAfter field', () => {
    const error = new RateLimitError(60)
    expect(error.retryAfter).toBe(60)
    expect(error.name).toBe('RateLimitError')
    expect(error).toBeInstanceOf(WebxaError)
  })
})

describe('UnknownProviderError', () => {
  it('should instantiate with provider field', () => {
    const error = new UnknownProviderError('unknown-provider')
    expect(error.provider).toBe('unknown-provider')
    expect(error.name).toBe('UnknownProviderError')
    expect(error).toBeInstanceOf(WebxaError)
  })
})

describe('normalizeError', () => {
  it('should pass through WebxaError', () => {
    const original = new WebxaError('Test error')
    const normalized = normalizeError(original)
    expect(normalized).toBe(original)
    expect(normalized).toBeInstanceOf(WebxaError)
  })

  it('should convert object with status 401 to AuthError', () => {
    const error = normalizeError({ status: 401, message: 'Unauthorized' })
    expect(error).toBeInstanceOf(AuthError)
    expect(error).toBeInstanceOf(WebxaError)
  })

  it('should convert HTTPError 401 to AuthError when provider is known', () => {
    const error = normalizeError(
      new HTTPError(401, 'https://example.com', 'Invalid API key'),
      'exa',
    )
    expect(error).toBeInstanceOf(AuthError)
    if (error instanceof AuthError) {
      expect(error.provider).toBe('exa')
      expect(error.message).toContain('Invalid API key')
    }
  })

  it('should convert HTTPError 401 to AuthError with unknown provider by default', () => {
    const error = normalizeError(
      new HTTPError(401, 'https://example.com', 'Invalid API key'),
    )
    expect(error).toBeInstanceOf(AuthError)
    if (error instanceof AuthError) {
      expect(error.provider).toBe('unknown')
    }
  })

  it('should convert object with status 429 to RateLimitError', () => {
    const error = normalizeError({ status: 429, message: 'Too many requests' })
    expect(error).toBeInstanceOf(RateLimitError)
    expect(error).toBeInstanceOf(WebxaError)
  })

  it('should use numeric Retry-After header for 429 when available', () => {
    const error = normalizeError({
      status: 429,
      message: 'Too many requests',
      response: { headers: { get: () => '120' } },
    })
    expect(error).toBeInstanceOf(RateLimitError)
    if (error instanceof RateLimitError) {
      expect(error.retryAfter).toBe(120)
    }
  })

  it('should fall back to 60 for non-numeric Retry-After header on 429', () => {
    const error = normalizeError({
      status: 429,
      message: 'Too many requests',
      response: { headers: { get: () => 'soon' } },
    })
    expect(error).toBeInstanceOf(RateLimitError)
    if (error instanceof RateLimitError) {
      expect(error.retryAfter).toBe(60)
    }
  })

  it('should fall back to 60 for negative Retry-After header on 429', () => {
    const error = normalizeError({
      status: 429,
      message: 'Too many requests',
      response: { headers: { get: () => '-5' } },
    })
    expect(error).toBeInstanceOf(RateLimitError)
    if (error instanceof RateLimitError) {
      expect(error.retryAfter).toBe(60)
    }
  })

  it('should return 0 for zero Retry-After header on 429', () => {
    const error = normalizeError({
      status: 429,
      message: 'Too many requests',
      response: { headers: { get: () => '0' } },
    })
    expect(error).toBeInstanceOf(RateLimitError)
    if (error instanceof RateLimitError) {
      expect(error.retryAfter).toBe(0)
    }
  })

  it('should fall back to 60 when response has no headers on 429', () => {
    const error = normalizeError({
      status: 429,
      message: 'Too many requests',
    })
    expect(error).toBeInstanceOf(RateLimitError)
    if (error instanceof RateLimitError) {
      expect(error.retryAfter).toBe(60)
    }
  })

  it('should convert object with status 500+ to HTTPError', () => {
    const error = normalizeError({ status: 500, message: 'Server error' })
    expect(error).toBeInstanceOf(HTTPError)
    expect(error).toBeInstanceOf(WebxaError)
  })

  it('should convert generic Error to WebxaError', () => {
    const original = new Error('Generic error')
    const normalized = normalizeError(original)
    expect(normalized).toBeInstanceOf(WebxaError)
    expect(normalized.message).toContain('Generic error')
  })

  it('should convert string to WebxaError', () => {
    const normalized = normalizeError('String error')
    expect(normalized).toBeInstanceOf(WebxaError)
    expect(normalized.message).toContain('String error')
  })

  it('all normalized errors should be instanceof WebxaError', () => {
    const errors = [
      normalizeError(new WebxaError('test')),
      normalizeError({ status: 401, message: 'Unauthorized' }),
      normalizeError({ status: 429, message: 'Too many requests' }),
      normalizeError({ status: 500, message: 'Server error' }),
      normalizeError(new Error('generic')),
      normalizeError('string'),
    ]

    errors.forEach((error) => {
      expect(error).toBeInstanceOf(WebxaError)
    })
  })
})

describe('parseRetryAfter', () => {
  it('should parse valid numeric string', () => {
    expect(parseRetryAfter('120')).toBe(120)
  })

  it('should return 60 for null', () => {
    expect(parseRetryAfter(null)).toBe(60)
  })

  it('should return 60 for undefined', () => {
    expect(parseRetryAfter(undefined)).toBe(60)
  })

  it('should return 60 for non-numeric string', () => {
    expect(parseRetryAfter('soon')).toBe(60)
  })

  it('should return 60 for negative value', () => {
    expect(parseRetryAfter('-5')).toBe(60)
  })

  it('should return 60 for empty string', () => {
    expect(parseRetryAfter('')).toBe(60)
  })

  it('should handle zero as valid', () => {
    expect(parseRetryAfter('0')).toBe(0)
  })

  it('should reject fractional values', () => {
    expect(parseRetryAfter('1.5')).toBe(60)
  })

  it('should reject numeric prefix with trailing text', () => {
    expect(parseRetryAfter('10s')).toBe(60)
  })

  it('should fall back for digit string that overflows to Infinity', () => {
    expect(parseRetryAfter('9'.repeat(400))).toBe(60)
  })
})
