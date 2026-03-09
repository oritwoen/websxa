# websxa

[![npm version](https://img.shields.io/npm/v/websxa?style=flat&colorA=130f40&colorB=474787)](https://npmjs.com/package/websxa)
[![npm downloads](https://img.shields.io/npm/dm/websxa?style=flat&colorA=130f40&colorB=474787)](https://npm.chart.dev/websxa)
[![license](https://img.shields.io/github/license/oritwoen/websxa?style=flat&colorA=130f40&colorB=474787)](https://github.com/oritwoen/websxa/blob/main/LICENSE)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/oritwoen/websxa)

One API for Brave, Exa, Tavily, SerpAPI, and SearXNG. Write your search logic once, swap the provider string, done.

If you're building an AI agent or a CLI tool that needs web search, you don't want to hardcode a single provider's API. They all return roughly the same thing, a list of URLs with titles and snippets, but the auth, endpoints, and response shapes are all different. Exa uses POST with `x-api-key`, Brave uses GET with `X-Subscription-Token`, Tavily puts the key in the request body. And so on.

`websxa` normalizes all of that behind a single interface. It also ships an [AI SDK](https://ai-sdk.dev/) tool and a CLI.

## Install

```bash
pnpm add websxa
```

For the AI SDK tool (`websxa/ai` subpath), you also need `ai` and `zod` as peer dependencies:

```bash
pnpm add ai zod
```

## Usage

Set your API key as an environment variable and create a provider:

```typescript
import { create } from 'websxa'

// Reads EXA_API_KEY from process.env
const exa = create('exa')

const results = await exa.search('typescript runtime benchmarks', { maxResults: 5 })

for (const result of results) {
  console.log(result.title, result.url)
}
```

Swap the provider string, same code:

```typescript
const brave = create('brave')   // reads BRAVE_API_KEY
const tavily = create('tavily') // reads TAVILY_API_KEY
```

You can also pass the key explicitly:

```typescript
const exa = create('exa', { apiKey: 'your-key-here' })
```

### Search all providers

Query all available providers in parallel and get deduplicated results:

```typescript
import { searchAll } from 'websxa'

// Detects providers from env vars, queries them in parallel
const results = await searchAll('latest node.js release')

for (const result of results) {
  console.log(`[${result.provider}]`, result.title, result.url)
}
```

`searchAll` uses `Promise.allSettled` internally, so if one provider fails, the others still return. Results are deduplicated by URL (normalized, UTM params stripped). When duplicates exist, the result with the higher score wins.

You can also specify which providers to query:

```typescript
const results = await searchAll('query', {
  providers: ['exa', 'brave'],
  maxResults: 5,
})
```

### AI SDK tool

The `websxa/ai` subpath exports a ready-made tool compatible with [Vercel AI SDK](https://ai-sdk.dev/docs/foundations/tools):

```typescript
import { generateText } from 'ai'
import { searchTool } from 'websxa/ai'

const { text } = await generateText({
  model: yourModel,
  tools: { webSearch: searchTool },
  prompt: 'Find the latest TypeScript release notes',
})
```

The tool accepts an optional `provider` parameter. Set it to `"all"` to query all available providers in parallel:

```typescript
// The AI can choose: a specific provider, or "all" for parallel search
tools: { webSearch: searchTool }
// Input schema: { query: string, provider?: "brave" | "exa" | ... | "all", maxResults?: number }
```

When no provider is specified, the tool auto-detects the first available one from environment variables.

## CLI

```bash
websxa search "your query" --provider brave --max-results 5
websxa search "your query" --json
websxa providers
```

| Command | Description |
|---------|-------------|
| `websxa search <query>` | Search the web using a provider |
| `websxa providers` | List built-in providers |

| Flag | Description |
|------|-------------|
| `--provider <name>` | Provider to use (default: `exa`) |
| `--max-results <n>` | Maximum results to return (default: `10`) |
| `--json` | Output as JSON |

## Providers

| Provider | Env var | Auth | Free tier |
|----------|---------|------|-----------|
| Brave | `BRAVE_API_KEY` | Header | 2k queries/mo |
| Exa | `EXA_API_KEY` | Header | 1k queries/mo |
| SearXNG | - | None | Self-hosted |
| SerpAPI | `SERPAPI_API_KEY` | Query param | 100 queries/mo |
| Tavily | `TAVILY_API_KEY` | Body | 1k queries/mo |

SearXNG requires no API key. It's a self-hosted metasearch engine. By default websxa connects to `http://localhost:8080`. Override with `baseURL`:

```typescript
const searx = create('searxng', { baseURL: 'https://searx.example.com' })
```

## Errors

All providers throw the same error types:

```typescript
import { AuthError, RateLimitError, HTTPError, UnknownProviderError } from 'websxa'

try {
  const results = await provider.search('query')
} catch (err) {
  if (err instanceof AuthError) {
    // Missing or invalid API key
  }
  if (err instanceof RateLimitError) {
    console.log(`Retry after ${err.retryAfter}s`)
  }
  if (err instanceof UnknownProviderError) {
    // Provider name not recognized
  }
}
```

A 401 from Exa and a 401 from Brave both become `AuthError`. A 429 from any provider becomes `RateLimitError` with a `retryAfter` value. Everything else is `HTTPError` or the base `WebxaError`.

## Data model

Every provider returns the same normalized type:

```typescript
interface SearchResult {
  url: string
  title: string
  snippet: string
  score?: number
  publishedDate?: string
  author?: string
  image?: string
  favicon?: string
  text?: string
  highlights?: string[]
  summary?: string
  metadata?: Record<string, unknown>
}
```

Optional fields depend on what the provider returns. Exa provides `score`, `text`, and `highlights`. Brave provides `favicon`. Not all providers populate all fields.

Search options you can pass to `.search()` or `searchAll`:

```typescript
interface SearchOptions {
  maxResults?: number
  includeDomains?: string[]
  excludeDomains?: string[]
  startPublishedDate?: string
  endPublishedDate?: string
  category?: string
}
```

`maxResults` works with every provider. Domain filtering and date ranges are currently Exa-specific. `category` is supported by Exa and SearXNG.

## Development

```bash
pnpm install
pnpm typecheck   # tsc --noEmit
pnpm build       # obuild
pnpm test        # vitest (watch mode)
pnpm test:run    # vitest --run
```

## License

[MIT](./LICENSE)
