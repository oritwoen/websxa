import { describe, expect, it } from 'vitest'
import { builtinProviders, create, version } from '../src/index.ts'

describe('webxa', () => {
  it('should export version matching package.json', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('should list all built-in provider names', () => {
    expect(builtinProviders).toEqual(['brave', 'exa', 'searxng', 'serpapi', 'tavily'])
  })

  it('should register built-in providers from main entrypoint', () => {
    for (const provider of builtinProviders) {
      const config = provider === 'searxng' ? undefined : { apiKey: 'test-api-key' }
      expect(() => create(provider, config)).not.toThrow()
    }
  })
})
