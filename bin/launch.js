#!/usr/bin/env node
// Start the server detached unless one is already running. Safe to call repeatedly (startup + watchdog hooks).
import { spawn } from 'node:child_process'
import { mkdirSync, openSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runtimeFile, stateDir } from '../server/paths.js'

try {
  const { pid } = JSON.parse(readFileSync(runtimeFile, 'utf8'))
  process.kill(pid, 0)
  process.exit(0) // already running
} catch {}

mkdirSync(stateDir, { recursive: true })
const log = openSync(path.join(stateDir, 'server.log'), 'a')
const main = fileURLToPath(new URL('../server/main.js', import.meta.url))
spawn(process.execPath, [main], { detached: true, stdio: ['ignore', log, log], env: process.env }).unref()
