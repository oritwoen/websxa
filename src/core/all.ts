import type { SearchResult, SearchOptions } from './types.ts'
import { create } from './registry.ts'
import { detectAvailableProviders } from './resolve.ts'

export interface SearchAllOptions extends SearchOptions {
  providers?: string[]
}

export interface SearchAllResult extends SearchResult {
  provider: string
}

/**
 * Query multiple providers in parallel and return deduplicated results.
 * Providers are auto-detected from env vars unless explicitly specified.
 * Individual provider failures don't affect other results.
 */
export async function searchAll(query: string, options?: SearchAllOptions): Promise<SearchAllResult[]> {
  const { providers: providerList, ...searchOptions } = options ?? {}
  const providerNames = providerList ?? detectAvailableProviders()

  const settled = await Promise.allSettled(
    providerNames.map(async (name) => {
      const provider = create(name)
      const results = await provider.search(query, searchOptions)
      return results.map(result => ({ ...result, provider: name }))
    }),
  )

  const allResults: SearchAllResult[] = []

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value)
    }
  }

  return deduplicateByUrl(allResults)
}



function deduplicateByUrl(results: SearchAllResult[]): SearchAllResult[] {
  const seen = new Map<string, SearchAllResult>()

  for (const result of results) {
    const normalized = normalizeUrl(result.url)
    const existing = seen.get(normalized)

    if (!existing) {
      seen.set(normalized, result)
    } else {
      if (result.score != null && (existing.score == null || result.score > existing.score)) {
        seen.set(normalized, result)
      }
    }
  }

  return Array.from(seen.values())
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    parsed.searchParams.delete('utm_source')
    parsed.searchParams.delete('utm_medium')
    parsed.searchParams.delete('utm_campaign')
    parsed.searchParams.delete('utm_content')
    parsed.searchParams.delete('utm_term')
    const path = parsed.pathname.replace(/\/+$/, '') || '/'
    return `${parsed.protocol}//${parsed.host}${path}${parsed.search}`
  } catch {
    return url
  }
}
