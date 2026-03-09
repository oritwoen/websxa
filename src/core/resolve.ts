import { builtinProviders, type WebSearchProviderName } from '../index.ts'
import { has } from './registry.ts'

const envKeys: Record<string, WebSearchProviderName> = {
  EXA_API_KEY: 'exa',
  BRAVE_API_KEY: 'brave',
  TAVILY_API_KEY: 'tavily',
  SERPAPI_API_KEY: 'serpapi',
}

export function detectAvailableProviders(): WebSearchProviderName[] {
  const available: WebSearchProviderName[] = []

  for (const [envVar, name] of Object.entries(envKeys)) {
    if (process.env[envVar]) {
      available.push(name)
    }
  }

  if (has('searxng')) {
    available.push('searxng')
  }

  return available
}

export function resolveDefaultProvider(): WebSearchProviderName {
  for (const [envVar, name] of Object.entries(envKeys)) {
    if (process.env[envVar]) {
      return name
    }
  }

  return 'searxng'
}

export interface ProviderStatus {
  name: WebSearchProviderName
  configured: boolean
  envVar: string | null
}

export function listProviders(): ProviderStatus[] {
  const available = detectAvailableProviders()
  return builtinProviders.map(name => ({
    name,
    configured: available.includes(name),
    envVar: name === 'searxng' ? null : `${name.toUpperCase()}_API_KEY`,
  }))
}
