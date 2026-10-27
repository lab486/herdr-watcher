#!/usr/bin/env node
// Start the server if needed, then print the dashboard URL and open it in the default browser.
import { execFileSync, spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runtimeFile } from '../server/paths.js'

execFileSync(process.execPath, [fileURLToPath(new URL('./launch.js', import.meta.url))], { stdio: 'inherit' })

// launch.js returns before the server listens; it writes the runtime file once it does.
const running = () => {
  try {
    const { pid, port } = JSON.parse(readFileSync(runtimeFile, 'utf8'))
    process.kill(pid, 0)
    return port
  } catch {}
}
let port
for (let i = 0; i < 50 && !(port = running()); i++) await new Promise((r) => setTimeout(r, 100))
if (!port) {
  console.error('herdr-watcher did not start. See server.log in the plugin state directory.')
  process.exit(1)
}
const url = `http://127.0.0.1:${port}`
console.log(url)
const [cmd, ...args] = process.platform === 'darwin' ? ['open'] : process.platform === 'win32' ? ['cmd', '/c', 'start', ''] : ['xdg-open']
spawn(cmd, [...args, url], { detached: true, stdio: 'ignore' }).on('error', () => {}).unref()
