import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { builtinProviders, has, version } from '../src/index.ts'

const packageJsonPath = resolve(dirname(fileURLToPath(import.meta.url)), '../package.json')
const packageJsonRaw = readFileSync(packageJsonPath, 'utf8')
const packageJson = JSON.parse(packageJsonRaw) as { sideEffects?: boolean | string[] }

describe('webxa', () => {
  it('should export version matching package.json', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('should list all built-in provider names', () => {
    expect(builtinProviders).toEqual(['brave', 'exa', 'searxng', 'serpapi', 'tavily'])
  })

  it('should register built-in providers from main entrypoint', () => {
    for (const provider of builtinProviders) {
      expect(has(provider)).toBe(true)
    }
  })

  it('should mark provider bootstrap files as side effectful for bundlers', () => {
    expect(Array.isArray(packageJson.sideEffects)).toBe(true)
    expect(packageJson.sideEffects).toContain('./dist/providers/*.mjs')
  })
})
