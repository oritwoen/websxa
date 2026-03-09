export const builtinProviders = [
  'brave',
  'exa',
  'searxng',
  'serpapi',
  'tavily',
] as const

export type WebSearchProviderName = typeof builtinProviders[number]
