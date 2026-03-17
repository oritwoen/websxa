import { tool } from 'ai'
import { z } from 'zod'
import { builtinProviders } from './core/providers.ts'
import { create } from './core/registry.ts'
import { searchAll } from './core/all.ts'
import { EmptyQueryError } from './core/errors.ts'
import { resolveDefaultProvider, listProviders } from './core/resolve.ts'
import './providers/index.ts'

const providerNames = [...builtinProviders, 'all'] as const

export const searchTool = tool({
  description: 'Search the web using multiple search engines (Brave, Exa, Tavily, SerpAPI, SearXNG). Returns relevant web pages with titles, URLs, snippets, and optional metadata. Use provider "all" to query all available providers in parallel and get deduplicated results.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    provider: z.enum(providerNames).optional().describe('Provider to use. Defaults to first available from env. Use "all" for parallel search.'),
    maxResults: z.number().min(1).max(20).optional().describe('Max results (default: 10)'),
    includeDomains: z.array(z.string()).optional().describe('Only return results from these domains (e.g. ["github.com", "stackoverflow.com"])'),
    excludeDomains: z.array(z.string()).optional().describe('Exclude results from these domains'),
    category: z.string().optional().describe('Search category (e.g. "news", "general"). Provider support varies.'),
    startPublishedDate: z.string().optional().describe('Filter results published after this date (ISO 8601, e.g. "2024-01-01")'),
    endPublishedDate: z.string().optional().describe('Filter results published before this date (ISO 8601)'),
  }),
  execute: async ({ query, provider: providerName, maxResults, includeDomains, excludeDomains, category, startPublishedDate, endPublishedDate }) => {
    if (!query.trim()) {
      throw new EmptyQueryError()
    }

    const searchOptions = { maxResults, includeDomains, excludeDomains, category, startPublishedDate, endPublishedDate }

    if (providerName === 'all') {
      return searchAll(query, searchOptions)
    }

    const name = providerName ?? resolveDefaultProvider()
    return create(name).search(query, searchOptions)
  },
})

export const providersTool = tool({
  description: 'List available web search providers and their configuration status.',
  inputSchema: z.object({}),
  execute: async () => listProviders(),
})
