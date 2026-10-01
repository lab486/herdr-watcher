#!/usr/bin/env node
// Print the dashboard URL and open it in the default browser.
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { runtimeFile } from '../server/paths.js'

let port
try { ({ port } = JSON.parse(readFileSync(runtimeFile, 'utf8'))) } catch {
  console.error('herdr-watcher is not running. Run bin/launch.js or restart herdr.')
  process.exit(1)
}
const url = `http://127.0.0.1:${port}`
console.log(url)
const [cmd, ...args] = process.platform === 'darwin' ? ['open'] : process.platform === 'win32' ? ['cmd', '/c', 'start', ''] : ['xdg-open']
spawn(cmd, [...args, url], { detached: true, stdio: 'ignore' }).on('error', () => {}).unref()
