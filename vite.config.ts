import fs from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { rari } from 'rari/vite'
import { defineConfig } from 'vite-plus'

// rari's build does not run through the `--env-file` npm scripts, so `.env`/`.env.local`
// are not in process.env at build time. Parse them here so the client-exposed
// `NEXT_PUBLIC_*` variables (settings menu, recording endpoint, …) reach the browser
// bundle exactly as the original Next app configured them.
//
// Docker builds intentionally never copy `.env*` into the build context (kept out via
// .dockerignore, same as upstream, so secrets never land in an image layer) — there,
// these same keys arrive as regular build ARGs/ENV instead, so `process.env` is checked
// as a fallback.
const dir = import.meta.dirname
const readEnv = (): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const file of ['.env', '.env.local']) {
    const full = path.join(dir, file)
    if (!fs.existsSync(full)) continue
    for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
    }
  }
  return out
}
const env = readEnv()
const pub = (key: string): string => {
  const value = env[key] ?? process.env[key]
  return value !== undefined ? JSON.stringify(value) : 'undefined'
}

export default defineConfig({
  plugins: [rari(), tailwindcss()],
  define: {
    'process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT': pub('NEXT_PUBLIC_CONN_DETAILS_ENDPOINT'),
    'process.env.NEXT_PUBLIC_SHOW_SETTINGS_MENU': pub('NEXT_PUBLIC_SHOW_SETTINGS_MENU'),
    'process.env.NEXT_PUBLIC_LK_RECORD_ENDPOINT': pub('NEXT_PUBLIC_LK_RECORD_ENDPOINT'),
    'process.env.NEXT_PUBLIC_DATADOG_CLIENT_TOKEN': pub('NEXT_PUBLIC_DATADOG_CLIENT_TOKEN'),
    'process.env.NEXT_PUBLIC_DATADOG_SITE': pub('NEXT_PUBLIC_DATADOG_SITE'),
  },
  resolve: {
    alias: {
      '@': path.resolve(dir, 'src'),
    },
  },
})
