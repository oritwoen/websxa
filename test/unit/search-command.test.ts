import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UnknownProviderError } from '../../src/core/errors.ts'

const mockLog = vi.fn()
const mockInfo = vi.fn()
const mockError = vi.fn()

const mockSearch = vi.fn()
const mockCreate = vi.fn((name: string, config: Record<string, unknown>) => {
  void name
  void config
  return {
  search: mockSearch,
  }
})
const mockResolveDefaultProvider = vi.fn(() => 'brave')

vi.mock('consola', () => ({
  consola: {
    log: (...args: unknown[]) => mockLog(...args),
    info: (...args: unknown[]) => mockInfo(...args),
    error: (...args: unknown[]) => mockError(...args),
  },
}))

vi.mock('../../src/core/registry.ts', () => ({
  create: (name: string, config: Record<string, unknown>) => mockCreate(name, config),
  providers: vi.fn(() => ['brave', 'exa']),
}))

vi.mock('../../src/core/resolve.ts', () => ({
  resolveDefaultProvider: () => mockResolveDefaultProvider(),
}))

vi.mock('../../src/providers/index.ts', () => ({}))

import searchCommand from '../../src/commands/search.ts'

describe('search command', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockLog.mockReset()
    mockInfo.mockReset()
    mockError.mockReset()
    mockSearch.mockReset()
    mockCreate.mockClear()
    mockResolveDefaultProvider.mockClear()
    mockSearch.mockResolvedValue([])
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('__EXIT__')
    }) as never)
  })

  afterEach(() => {
    exitSpy.mockRestore()
  })

  it('uses resolved default provider when provider arg is omitted', async () => {
    await searchCommand.run!({
      args: {
        query: 'test query',
        provider: undefined,
        'max-results': '10',
        json: false,
      },
    } as never)

    expect(mockResolveDefaultProvider).toHaveBeenCalledOnce()
    expect(mockCreate).toHaveBeenCalledWith('brave', {})
  })

  it('uses explicit provider when provider arg is set', async () => {
    await searchCommand.run!({
      args: {
        query: 'test query',
        provider: 'exa',
        'max-results': '10',
        json: false,
      },
    } as never)

    expect(mockResolveDefaultProvider).not.toHaveBeenCalled()
    expect(mockCreate).toHaveBeenCalledWith('exa', {})
  })

  it('reports unknown provider using resolved provider name', async () => {
    mockCreate.mockImplementationOnce(() => {
      throw new UnknownProviderError('brave')
    })

    await expect(
      searchCommand.run!({
        args: {
          query: 'test query',
          provider: undefined,
          'max-results': '10',
          json: false,
        },
      } as never),
    ).rejects.toThrow('__EXIT__')

    expect(mockError).toHaveBeenCalledWith('Unknown provider: brave')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('shows a helpful message when no provider is configured', async () => {
    mockResolveDefaultProvider.mockImplementationOnce(() => {
      throw new Error('No web search provider configured. Set an API key env var or register a provider.')
    })

    await expect(
      searchCommand.run!({
        args: {
          query: 'test query',
          provider: undefined,
          'max-results': '10',
          json: false,
        },
      } as never),
    ).rejects.toThrow('__EXIT__')

    expect(mockError).toHaveBeenCalledWith(
      'No web search provider configured. Set an API key env var or register a provider.',
    )
    expect(mockInfo).toHaveBeenCalledWith('Registered providers: brave, exa')
    expect(mockInfo).toHaveBeenCalledWith('Set one provider API key env var or pass --provider explicitly.')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})
