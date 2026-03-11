import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPostJSON = vi.fn()
const mockGetJSON = vi.fn()

vi.mock('../../src/core/client.ts', () => ({
  Client: vi.fn(),
  defaultClient: vi.fn(() => ({
    postJSON: mockPostJSON,
    getJSON: mockGetJSON,
    maxRetries: 5,
    baseDelay: 50,
    timeout: 30000,
    userAgent: 'webxa/0.0.1',
  })),
}))

import { searchAll } from '../../src/core/all.ts'
import { UnknownProviderError } from '../../src/core/errors.ts'

import '../../src/providers/index.ts'

const exaResponse = {
  requestId: 'test-req',
  results: [{
    id: '1',
    url: 'https://a.com',
    title: 'Exa Result',
    score: 0.9,
    text: 'Exa text',
    highlights: ['Exa highlight'],
  }],
}

const braveResponse = {
  web: {
    results: [{
      url: 'https://b.com',
      title: 'Brave Result',
      description: 'Brave description',
      extra_snippets: [],
      meta_url: { favicon: 'https://b.com/favicon.ico' },
    }],
  },
}

describe('searchAll', () => {
  beforeEach(() => {
    mockPostJSON.mockReset()
    mockGetJSON.mockReset()
    delete process.env.EXA_API_KEY
    delete process.env.BRAVE_API_KEY
    delete process.env.TAVILY_API_KEY
    delete process.env.SERPAPI_API_KEY
  })

  it('queries multiple providers and merges results', async () => {
    process.env.EXA_API_KEY = 'test-exa'
    process.env.BRAVE_API_KEY = 'test-brave'
    mockPostJSON.mockResolvedValue(exaResponse)
    mockGetJSON.mockResolvedValue(braveResponse)

    const results = await searchAll('test', { providers: ['exa', 'brave'] })

    expect(results).toHaveLength(2)
    expect(results.map(r => r.provider)).toContain('exa')
    expect(results.map(r => r.provider)).toContain('brave')
  })

  it('deduplicates by URL keeping higher score', async () => {
    process.env.EXA_API_KEY = 'test-exa'
    process.env.BRAVE_API_KEY = 'test-brave'

    mockPostJSON.mockResolvedValue({
      requestId: 'test-req',
      results: [{
        id: '1',
        url: 'https://example.com',
        title: 'From Exa',
        score: 0.9,
        text: 'text',
        highlights: ['highlight'],
      }],
    })

    mockGetJSON.mockResolvedValue({
      web: {
        results: [{
          url: 'https://example.com',
          title: 'From Brave',
          description: 'desc',
          extra_snippets: [],
          meta_url: { favicon: '' },
        }],
      },
    })

    const results = await searchAll('test', { providers: ['exa', 'brave'] })

    expect(results).toHaveLength(1)
    expect(results[0].provider).toBe('exa')
    expect(results[0].score).toBe(0.9)
  })

  it('handles provider failures gracefully', async () => {
    process.env.EXA_API_KEY = 'test-exa'
    process.env.BRAVE_API_KEY = 'test-brave'

    mockPostJSON.mockRejectedValue(new Error('exa down'))
    mockGetJSON.mockResolvedValue(braveResponse)

    const results = await searchAll('test', { providers: ['exa', 'brave'] })

    expect(results).toHaveLength(1)
    expect(results[0].provider).toBe('brave')
  })

  it('detects available providers from env', async () => {
    process.env.BRAVE_API_KEY = 'test-brave'
    mockGetJSON.mockResolvedValue(braveResponse)

    const results = await searchAll('test')

    expect(results.length).toBeGreaterThanOrEqual(1)
    const providers = results.map(r => r.provider)
    expect(providers).toContain('brave')
  })

  it('normalizes URLs for dedup (trailing slash)', async () => {
    process.env.EXA_API_KEY = 'test-exa'
    process.env.BRAVE_API_KEY = 'test-brave'

    mockPostJSON.mockResolvedValue({
      requestId: 'test-req',
      results: [{
        id: '1',
        url: 'https://example.com/page/',
        title: 'With slash',
        score: 0.5,
        text: 'text',
        highlights: ['hl'],
      }],
    })

    mockGetJSON.mockResolvedValue({
      web: {
        results: [{
          url: 'https://example.com/page',
          title: 'Without slash',
          description: 'desc',
          extra_snippets: [],
          meta_url: { favicon: '' },
        }],
      },
    })

    const results = await searchAll('test', { providers: ['exa', 'brave'] })

    expect(results).toHaveLength(1)
  })

  it('returns empty array when all providers fail', async () => {
    mockGetJSON.mockRejectedValue(new Error('searxng down'))

    const results = await searchAll('test', { providers: ['searxng'] })

    expect(results).toEqual([])
  })

  it('throws UnknownProviderError for explicit unknown providers', async () => {
    await expect(
      searchAll('test', { providers: ['not-real-provider'] }),
    ).rejects.toThrow(UnknownProviderError)
  })
})
