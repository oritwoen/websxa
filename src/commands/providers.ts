import { defineCommand } from 'citty'
import { consola } from 'consola'
import { builtinProviders, version } from '../index.ts'

const NO_KEY_REQUIRED = new Set(['searxng'])

interface ProviderStatus {
  name: string
  envVar: string | null
  configured: boolean
}

function getProviderStatus(name: string): ProviderStatus {
  if (NO_KEY_REQUIRED.has(name)) {
    return { name, envVar: null, configured: true }
  }
  const envVar = `${name.toUpperCase()}_API_KEY`
  return { name, envVar, configured: !!process.env[envVar] }
}

export default defineCommand({
  meta: {
    name: 'providers',
    description: 'List built-in providers and their configuration status',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Print providers as JSON with configuration status',
      default: false,
    },
  },
  run({ args }) {
    const status = builtinProviders.map(getProviderStatus)

    if (args.json) {
      process.stdout.write(`${JSON.stringify(status, null, 2)}\n`)
      return
    }

    consola.log(`webxa ${version}`)
    for (const { name, envVar, configured } of status) {
      if (configured) {
        consola.log(`  \x1b[32m\u2713\x1b[0m ${name}`)
      } else {
        consola.log(`  \x1b[31m\u2717\x1b[0m ${name}  \x1b[90m${envVar} not set\x1b[0m`)
      }
    }
  },
})
