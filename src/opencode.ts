import type { Plugin } from '@opencode-ai/plugin'
import { tool } from '@opencode-ai/plugin'
import { encode } from '@toon-format/toon'
import { builtinProviders } from './core/providers.ts'
import { create } from './core/registry.ts'
import { searchAll } from './core/all.ts'
import { resolveDefaultProvider, listProviders } from './core/resolve.ts'
import './providers/index.ts'

const z = tool.schema
const providerNames = [...builtinProviders, 'all'] as const

const WebsxaPlugin: Plugin = async () => ({
  tool: {
    websxa: tool({
      description: 'Search the web using multiple search engines (Brave, Exa, Tavily, SerpAPI, SearXNG). Returns relevant web pages with titles, URLs, snippets, and optional metadata. Use provider "all" to query all available providers in parallel and get deduplicated results.',
      args: {
        query: z.string().describe('Search query'),
        provider: z.enum(providerNames).optional().describe('Provider to use. Defaults to first available from env. Use "all" for parallel search.'),
        maxResults: z.number().min(1).max(20).optional().describe('Max results (default: 10)'),
        includeDomains: z.array(z.string()).optional().describe('Only return results from these domains (e.g. ["github.com", "stackoverflow.com"])'),
        excludeDomains: z.array(z.string()).optional().describe('Exclude results from these domains'),
        category: z.string().optional().describe('Search category (e.g. "news", "general"). Provider support varies.'),
        startPublishedDate: z.string().optional().describe('Filter results published after this date (ISO 8601, e.g. "2024-01-01")'),
        endPublishedDate: z.string().optional().describe('Filter results published before this date (ISO 8601)'),
      },
      async execute(args) {
        const { query, provider: providerName, maxResults, includeDomains, excludeDomains, category, startPublishedDate, endPublishedDate } = args
        const searchOptions = { maxResults, includeDomains, excludeDomains, category, startPublishedDate, endPublishedDate }

        if (providerName === 'all') {
          return encode(await searchAll(query, searchOptions))
        }

        const name = providerName ?? resolveDefaultProvider()
        return encode(await create(name).search(query, searchOptions))
      },
    }),
    websxa_providers: tool({
      description: 'List available web search providers and their configuration status.',
      args: {},
      async execute() {
        return encode(listProviders())
      },
    }),
  },
})

export { WebsxaPlugin }
export default WebsxaPlugin
