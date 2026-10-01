// Incrementally read a Claude Code session transcript (JSONL) into chat messages.
import { existsSync, openSync, readSync, closeSync, statSync, readdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const PROJECTS = path.join(os.homedir(), '.claude', 'projects')
const MAX_FIELD = 4000
const KEEP = 200
const found = new Map()

// herdr's cwd may differ from Claude's (symlinks like /tmp → /private/tmp), so find the file by session id.
export function findTranscript(sessionId) {
  if (!sessionId || !/^[\w-]+$/.test(sessionId)) return null
  if (found.has(sessionId) && existsSync(found.get(sessionId))) return found.get(sessionId)
  let dirs = []
  try { dirs = readdirSync(PROJECTS) } catch { return null }
  for (const d of dirs) {
    const f = path.join(PROJECTS, d, `${sessionId}.jsonl`)
    if (existsSync(f)) {
      found.set(sessionId, f)
      return f
    }
  }
  return null
}

const clip = (s) => (s.length > MAX_FIELD ? s.slice(0, MAX_FIELD) + '\n…' : s)
const toText = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((p) => p.text ?? '').join('\n') : '')

export function createTranscript(file) {
  let offset = 0
  let rest = ''
  const messages = []
  const tools = new Map()

  function add(entry) {
    if (entry.isSidechain || entry.isMeta || !entry.message) return
    const { role, content } = entry.message
    if (entry.type === 'user' && role === 'user') {
      if (typeof content === 'string') {
        if (!content.startsWith('<')) messages.push({ id: entry.uuid, role: 'user', parts: [{ type: 'text', text: content }] })
        return
      }
      for (const p of content) {
        if (p.type === 'tool_result' && tools.has(p.tool_use_id)) {
          const t = tools.get(p.tool_use_id)
          t.output = clip(toText(p.content))
          t.error = !!p.is_error
        } else if (p.type === 'text' && !p.text.startsWith('<')) {
          messages.push({ id: entry.uuid, role: 'user', parts: [{ type: 'text', text: p.text }] })
        }
      }
    } else if (entry.type === 'assistant' && Array.isArray(content)) {
      let last = messages.at(-1)
      if (last?.role !== 'assistant') messages.push((last = { id: entry.uuid, role: 'assistant', parts: [] }))
      for (const p of content) {
        if (p.type === 'text' && p.text.trim()) last.parts.push({ type: 'text', text: p.text })
        if (p.type === 'tool_use') {
          const t = { type: 'tool', id: p.id, name: p.name, input: clip(JSON.stringify(p.input ?? {}, null, 2)) }
          tools.set(p.id, t)
          last.parts.push(t)
        }
      }
    }
  }

  // Reads new bytes since the last call. Returns true when messages changed.
  function poll() {
    let size
    try { size = statSync(file).size } catch { return false }
    if (size < offset) { offset = 0; rest = ''; messages.length = 0; tools.clear() } // truncated or rewritten
    if (size === offset) return false
    const fd = openSync(file, 'r')
    const buf = Buffer.alloc(size - offset)
    readSync(fd, buf, 0, buf.length, offset)
    closeSync(fd)
    offset = size
    const lines = (rest + buf.toString('utf8')).split('\n')
    rest = lines.pop()
    for (const line of lines) {
      try { add(JSON.parse(line)) } catch {}
    }
    if (messages.length > KEEP * 2) {
      const cut = messages.splice(0, messages.length - KEEP)
      for (const m of cut) for (const p of m.parts) if (p.type === 'tool') tools.delete(p.id)
    }
    return true
  }

  return { poll, messages: () => messages.slice(-KEEP) }
}
