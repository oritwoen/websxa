import { tool } from 'ai'
import { z } from 'zod'
import { builtinProviders } from './index.ts'
import { create } from './core/registry.ts'
import { searchAll } from './core/all.ts'
import { resolveDefaultProvider, listProviders } from './core/resolve.ts'
import './providers/index.ts'

const providerNames = [...builtinProviders, 'all'] as const

export const searchTool = tool({
  description: 'Search the web using multiple search engines (Brave, Exa, Tavily, SerpAPI, SearXNG). Returns relevant web pages with titles, URLs, snippets, and optional metadata. Use provider "all" to query all available providers in parallel and get deduplicated results.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    provider: z.enum(providerNames).optional().describe('Provider to use. Defaults to first available from env. Use "all" for parallel search.'),
    maxResults: z.number().min(1).max(20).optional().describe('Max results (default: 10)'),
  }),
  execute: async ({ query, provider: providerName, maxResults }) => {
    if (providerName === 'all') {
      return searchAll(query, { maxResults })
    }

    const name = providerName ?? resolveDefaultProvider()
    return create(name).search(query, { maxResults })
  },
})

export const providersTool = tool({
  description: 'List available web search providers and their configuration status.',
  inputSchema: z.object({}),
  execute: async () => listProviders(),
})
