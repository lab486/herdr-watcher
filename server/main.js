// Server entry. Started detached by bin/launch.js; records its pid/port in the plugin state dir.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { configDir, runtimeFile, stateDir } from './paths.js'
import { createServer } from './http.js'
import { createState } from './state.js'

let config = {}
try { config = JSON.parse(readFileSync(path.join(configDir, 'config.json'), 'utf8')) } catch {}
const port = Number(process.env.HERDR_WATCHER_PORT || config.port || 7483)
const allowedHosts = ['localhost', '127.0.0.1', '::1', ...(config.allowedHosts ?? []).map((h) => String(h).toLowerCase())]
const distDir = fileURLToPath(new URL('../web/dist', import.meta.url))

const server = createServer({ state: createState(), allowedHosts, distDir })
server.on('error', (e) => {
  console.error(e.code === 'EADDRINUSE' ? `port ${port} is in use (already running?)` : e)
  process.exit(1)
})
server.listen(port, '127.0.0.1', () => {
  mkdirSync(stateDir, { recursive: true })
  writeFileSync(runtimeFile, JSON.stringify({ pid: process.pid, port }))
  console.log(`herdr-watcher on http://127.0.0.1:${port}`)
})
const stop = () => {
  try { if (JSON.parse(readFileSync(runtimeFile, 'utf8')).pid === process.pid) rmSync(runtimeFile) } catch {}
  process.exit(0)
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
