import type { SearchResult, SearchOptions, SearchProvider, ProviderConfig, ProviderFactory } from '../core/types.ts'
import { defaultClient } from '../core/client.ts'
import type { Client } from '../core/client.ts'
import { normalizeError } from '../core/errors.ts'
import { register } from '../core/registry.ts'

interface SearXNGResult {
  title: string
  url: string
  content: string
  engine: string
  engines: string[]
  score: number
  category: string
  publishedDate?: string
  img_src?: string
  thumbnail?: string
}

interface SearXNGSearchResponse {
  results: SearXNGResult[]
  number_of_results?: number
  query: string
}

class SearXNGProvider implements SearchProvider {
  private readonly client: Client
  private readonly baseURL: string

  constructor(config: ProviderConfig) {
    this.client = defaultClient()
    this.baseURL = config.baseURL ?? 'http://localhost:8080'
  }

  name(): string {
    return 'searxng'
  }

  /**
   * Quick reachability probe for self-hosted instances. Returns false instead
   * of throwing so {@link searchAll} can skip an unreachable instance silently.
   * Treats any HTTP response (even 4xx) as reachable — the host is up.
   * Uses a 1500ms timeout so a dead localhost:8080 does not stall fan-out.
   */
  async isAvailable(): Promise<boolean> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 1500)
    try {
      const response = await fetch(this.baseURL, {
        method: 'GET',
        signal: controller.signal,
      })
      // Any HTTP status means the host responded; treat as reachable.
      return typeof response.status === 'number'
    }
    catch {
      return false
    }
    finally {
      clearTimeout(timer)
    }
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        pageno: '1',
      })

      if (options?.category) {
        params.append('categories', options.category)
      }

      const url = `${this.baseURL}/search?${params.toString()}`
      const response = await this.client.getJSON<SearXNGSearchResponse>(url)

      let results = response.results.map(mapResult)

      if (options?.maxResults) {
        results = results.slice(0, options.maxResults)
      }

      return results
    }
    catch (error) {
      throw normalizeError(error, 'searxng')
    }
  }
}

function mapResult(result: SearXNGResult): SearchResult {
  return {
    url: result.url,
    title: result.title,
    snippet: result.content,
    score: result.score,
    publishedDate: result.publishedDate,
    image: result.img_src ?? result.thumbnail,
    metadata: {
      engine: result.engine,
      engines: result.engines,
      category: result.category,
    },
  }
}

const factory: ProviderFactory = (config) => new SearXNGProvider(config)

register('searxng', 'http://localhost:8080', factory)
