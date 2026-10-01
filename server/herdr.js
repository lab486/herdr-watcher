// Minimal client for the herdr socket: newline-delimited JSON, one connection per request.
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

export const socketPath =
  process.env.HERDR_SOCKET_PATH || path.join(os.homedir(), '.config', 'herdr', 'herdr.sock')

let seq = 0

export function request(method, params = {}, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection(socketPath)
    let buf = ''
    const done = (err, val) => {
      clearTimeout(timer)
      sock.destroy()
      err ? reject(err) : resolve(val)
    }
    const timer = setTimeout(() => done(new Error(`herdr ${method} timed out`)), timeoutMs)
    sock.on('connect', () => sock.write(JSON.stringify({ id: `hw:${++seq}`, method, params }) + '\n'))
    sock.on('data', (d) => {
      buf += d
      const nl = buf.indexOf('\n')
      if (nl < 0) return
      const msg = JSON.parse(buf.slice(0, nl))
      if (msg.error) done(Object.assign(new Error(msg.error.message), { code: msg.error.code }))
      else done(null, msg.result)
    })
    sock.on('error', (e) => done(e))
    sock.on('end', () => done(new Error(`herdr ${method}: connection closed`)))
  })
}

export const snapshot = async () => (await request('session.snapshot')).snapshot

export async function readPane(paneId, format = 'text') {
  const r = await request('pane.read', { pane_id: paneId, source: 'visible', format, strip_ansi: format === 'text' })
  return r.read
}

export const sendKeys = (paneId, keys) => request('pane.send_keys', { pane_id: paneId, keys })
export const prompt = (paneId, text) => request('agent.prompt', { target: paneId, text })
