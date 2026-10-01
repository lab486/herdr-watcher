import assert from 'node:assert/strict'
import { appendFileSync, copyFileSync, mkdtempSync, writeFileSync } from 'node:fs'
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

test('shows a message sent while Claude was busy (absorbed mid-turn)', () => {
  const f = path.join(mkdtempSync(path.join(os.tmpdir(), 'hw-')), 's.jsonl')
  const lines = [
    { type: 'user', uuid: 'u1', message: { role: 'user', content: 'refactor the parser' } },
    { type: 'assistant', uuid: 'a1', message: { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'npm test' } }] } },
    { type: 'queue-operation', operation: 'enqueue', content: 'also update the README' },
    { type: 'queue-operation', operation: 'remove', content: 'also update the README', reason: 'absorbed_mid_turn' },
    { type: 'attachment', uuid: 'q1', attachment: { type: 'queued_command', prompt: 'also update the README', commandMode: 'prompt', origin: { kind: 'human' } } },
    { type: 'attachment', uuid: 'q2', attachment: { type: 'queued_command', prompt: '<task-notification>done</task-notification>', commandMode: 'task-notification', origin: { kind: 'task' } } },
    { type: 'assistant', uuid: 'a2', message: { role: 'assistant', content: [{ type: 'text', text: 'Will do.' }] } },
  ]
  writeFileSync(f, lines.map((l) => JSON.stringify(l)).join('\n') + '\n')
  const t = createTranscript(f)
  t.poll()
  const msgs = t.messages()
  assert.deepEqual(msgs.map((m) => m.role), ['user', 'assistant', 'user', 'assistant'])
  assert.equal(msgs[2].id, 'q1')
  assert.equal(msgs[2].parts[0].text, 'also update the README')
  assert.equal(msgs[3].parts[0].text, 'Will do.')
})
