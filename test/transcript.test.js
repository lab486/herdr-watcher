import assert from 'node:assert/strict'
import { appendFileSync, copyFileSync, mkdtempSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createTranscript } from '../server/transcript.js'

const fixture = fileURLToPath(new URL('./fixtures/claude-transcript.jsonl', import.meta.url))

test('builds chat messages and pairs tool results', () => {
  const t = createTranscript(fixture)
  assert.equal(t.poll(), true)
  const msgs = t.messages()
  assert.deepEqual(msgs.map((m) => m.role), ['user', 'assistant', 'user', 'assistant', 'user', 'assistant', 'user', 'assistant'])
  const bash = msgs[1].parts[0]
  assert.equal(bash.type, 'tool')
  assert.equal(bash.name, 'Bash')
  assert.match(bash.output, /completed with no output/)
  assert.equal(msgs[1].parts[1].type, 'text')
  assert.equal(msgs.at(-1).parts[0].name, 'Write')
  assert.equal(msgs.at(-1).parts[0].output, undefined) // still pending
  const text = JSON.stringify(msgs)
  assert.ok(!text.includes('system-reminder') && !text.includes('/clear') && !text.includes('subagent chatter'))
  assert.equal(t.poll(), false)
})

test('picks up appended lines incrementally, including a split line', () => {
  const f = path.join(mkdtempSync(path.join(os.tmpdir(), 'hw-')), 's.jsonl')
  copyFileSync(fixture, f)
  const t = createTranscript(f)
  t.poll()
  const n = t.messages().length
  const line = JSON.stringify({ type: 'user', uuid: 'u9', message: { role: 'user', content: 'next step' } })
  appendFileSync(f, line.slice(0, 20))
  t.poll()
  assert.equal(t.messages().length, n)
  appendFileSync(f, line.slice(20) + '\n')
  assert.equal(t.poll(), true)
  assert.equal(t.messages().at(-1).parts[0].text, 'next step')
})
