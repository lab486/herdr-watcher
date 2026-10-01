#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { runtimeFile } from '../server/paths.js'

try { process.kill(JSON.parse(readFileSync(runtimeFile, 'utf8')).pid, 'SIGTERM') } catch { console.log('not running') }
