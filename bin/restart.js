#!/usr/bin/env node
// Stop the running server (if any), wait for it to exit, then start a fresh one.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runtimeFile } from '../server/paths.js'

let pid
try { ({ pid } = JSON.parse(readFileSync(runtimeFile, 'utf8'))) } catch {}
const alive = () => { try { process.kill(pid, 0); return true } catch { return false } }
if (pid && alive()) {
  process.kill(pid, 'SIGTERM')
  for (let i = 0; i < 50 && alive(); i++) await new Promise((r) => setTimeout(r, 100))
}
execFileSync(process.execPath, [fileURLToPath(new URL('./launch.js', import.meta.url))], { stdio: 'inherit' })
