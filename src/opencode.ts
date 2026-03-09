import type { Plugin } from '@opencode-ai/plugin'
import { tool } from '@opencode-ai/plugin'
import { encode } from '@toon-format/toon'
import { searchTool, providersTool } from './ai.ts'
import { create } from './core/registry.ts'
import { searchAll } from './core/all.ts'
import { resolveDefaultProvider, listProviders } from './core/resolve.ts'
import './providers/index.ts'

const WebsxaPlugin: Plugin = async () => ({
  tool: {
    websxa: tool({
      description: searchTool.description!,
      args: (searchTool.inputSchema as any).shape,
      async execute(args: any) {
        const { query, provider: providerName, maxResults } = args

        if (providerName === 'all') {
          return encode(await searchAll(query, { maxResults }))
        }

        const name = providerName ?? resolveDefaultProvider()
        return encode(await create(name).search(query, { maxResults }))
      },
    }),
    websxa_providers: tool({
      description: providersTool.description!,
      args: (providersTool.inputSchema as any).shape,
      async execute() {
        return encode(listProviders())
      },
    }),
  },
})

export { WebsxaPlugin }
export default WebsxaPlugin
