// HTTP API + static files. Binds to 127.0.0.1; how it is exposed is up to the user.
import { createReadStream, existsSync, statSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { prompt, readPane, request, sendKeys } from './herdr.js'
import { parseClaudePrompt } from './prompt-claude.js'
import { createTranscript, findTranscript } from './transcript.js'

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json', '.webmanifest': 'application/manifest+json' }
const ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()][0-9A-Za-z]/g

const hostname = (h) => (h ?? '').replace(/:\d+$/, '').replace(/^\[|\]$/g, '').toLowerCase()

// Blocks DNS rebinding (unknown Host) and cross-site writes (Origin that isn't this host).
export function checkRequest({ method, headers }, allowedHosts) {
  const host = hostname(headers.host)
  if (!allowedHosts.includes(host)) return `Host "${host}" is not allowed. Add it to allowedHosts in the plugin config.json.`
  if (method !== 'GET' && method !== 'HEAD' && headers.origin) {
    let origin
    try { origin = new URL(headers.origin).host } catch {}
    if (origin !== headers.host) return 'Cross-origin request refused.'
  }
  return null
}

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function readJson(req) {
  let body = ''
  for await (const chunk of req) {
    body += chunk
    if (body.length > 64 * 1024) throw new Error('body too large')
  }
  return JSON.parse(body || '{}')
}

function sse(req, res) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' })
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 20000)
  const cleanups = [() => clearInterval(heartbeat)]
  req.on('close', () => cleanups.forEach((f) => f()))
  return {
    send: (event, data) => res.write(`event: ${event}\ndata: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`),
    onClose: (f) => cleanups.push(f),
  }
}

// Live screen + transcript for one pane while an agent view is open.
function paneStream(req, res, state, paneId) {
  const stream = sse(req, res)
  let lastScreen = ''
  let transcript = null
  let busy = false
  const tick = async () => {
    if (busy) return
    busy = true
    try {
      const { text } = await readPane(paneId, 'ansi')
      if (text !== lastScreen) {
        lastScreen = text
        const lines = text.split('\n')
        const cols = Math.max(20, ...lines.map((l) => [...l.replace(ANSI, '')].length))
        stream.send('screen', { ansi: text, cols, rows: lines.length })
      }
      const sessionId = state.agent(paneId)?.sessionId
      if (sessionId && !transcript) {
        const file = findTranscript(sessionId)
        if (file) transcript = createTranscript(file)
      }
      if (transcript?.poll()) stream.send('messages', transcript.messages())
    } catch (e) {
      stream.send('error', { message: e.message })
    } finally {
      busy = false
    }
  }
  tick()
  const timer = setInterval(tick, 500)
  stream.onClose(() => clearInterval(timer))
}

function serveStatic(res, distDir, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath).replace(/^\/+/, '')
  const file = path.join(distDir, path.normalize(rel))
  if (!file.startsWith(distDir + path.sep) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end('Not found. Did you run `npm run build`?')
    return
  }
  const immutable = rel.startsWith('assets/')
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  createReadStream(file).pipe(res)
}

export function createServer({ state, allowedHosts, distDir }) {
  return http.createServer(async (req, res) => {
    const denied = checkRequest(req, allowedHosts)
    if (denied) return send(res, 403, { error: denied })
    const url = new URL(req.url, 'http://x')
    const [, api, resource, rawId, action] = url.pathname.split('/')
    if (api !== 'api') return serveStatic(res, distDir, url.pathname)

    try {
      if (resource === 'state' && req.method === 'GET') {
        const stream = sse(req, res)
        if (state.json()) stream.send('state', state.json())
        stream.onClose(state.subscribe(() => stream.send('state', state.json())))
        return
      }
      if (resource !== 'panes') return send(res, 404, { error: 'not found' })
      const paneId = decodeURIComponent(rawId ?? '')
      if (!state.agent(paneId)) await state.refresh() // a deep link can arrive before the first poll
      const agent = state.agent(paneId)
      if (!agent) return send(res, 404, { error: `unknown pane ${paneId}` })

      if (action === 'stream' && req.method === 'GET') return paneStream(req, res, state, paneId)
      if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })
      const body = await readJson(req)

      if (action === 'prompt') {
        const text = String(body.text ?? '').trim()
        if (!text) return send(res, 400, { error: 'empty prompt' })
        // A blocked agent refuses agent.prompt; typed answers ("Type something") go in as plain text + Enter.
        if (agent.status === 'blocked') await request('pane.send_input', { pane_id: paneId, text: text.replace(/\s*\n\s*/g, ' '), keys: ['Enter'] })
        else await prompt(paneId, text)
        return send(res, 200, { ok: true })
      }
      if (action === 'keys') {
        const keys = body.keys
        if (!Array.isArray(keys) || !keys.length || keys.length > 20 || !keys.every((k) => typeof k === 'string' && k.length <= 20))
          return send(res, 400, { error: 'keys must be 1-20 short strings' })
        await sendKeys(paneId, keys)
        return send(res, 200, { ok: true })
      }
      if (action === 'answer') {
        // Re-read the screen so a stale tap can never answer a different prompt.
        const fresh = parseClaudePrompt((await readPane(paneId)).text)
        if (!fresh || fresh.fingerprint !== body.fingerprint) return send(res, 409, { error: 'prompt changed', prompt: fresh })
        const choice = fresh.actions[body.index]
        if (!choice) return send(res, 400, { error: 'no such option' })
        await sendKeys(paneId, choice.keys)
        state.refresh()
        return send(res, 200, { ok: true })
      }
      return send(res, 404, { error: 'not found' })
    } catch (e) {
      if (!res.headersSent) send(res, 502, { error: e.message })
    }
  })
}
