import './providers/index.ts'

export { version } from './version.ts'

export { builtinProviders, type WebSearchProviderName } from './core/providers.ts'

export type { SearchResult, SearchOptions, SearchProvider, ProviderConfig, ProviderFactory, ClientOptions } from './core/types.ts'

export { WebxaError, HTTPError, AuthError, RateLimitError, UnknownProviderError, NoProviderConfiguredError, normalizeError } from './core/errors.ts'

export { Client, defaultClient } from './core/client.ts'

export { register, create, providers, has } from './core/registry.ts'

export { searchAll } from './core/all.ts'
export type { SearchAllOptions, SearchAllResult } from './core/all.ts'

export { resolveDefaultProvider, detectAvailableProviders, listProviders } from './core/resolve.ts'
export type { ProviderStatus } from './core/resolve.ts'
