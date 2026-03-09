export { version } from './version.ts'

export const builtinProviders = [
  'brave',
  'exa',
  'searxng',
  'serpapi',
  'tavily',
] as const

export type WebSearchProviderName = typeof builtinProviders[number]

export type { SearchResult, SearchOptions, SearchProvider, ProviderConfig, ProviderFactory, ClientOptions } from './core/types.ts'

export { WebxaError, HTTPError, AuthError, RateLimitError, UnknownProviderError, normalizeError } from './core/errors.ts'

export { Client, defaultClient } from './core/client.ts'

export { register, create, providers, has } from './core/registry.ts'

export { searchAll } from './core/all.ts'
export type { SearchAllOptions, SearchAllResult } from './core/all.ts'

export { resolveDefaultProvider, detectAvailableProviders, listProviders } from './core/resolve.ts'
export type { ProviderStatus } from './core/resolve.ts'
