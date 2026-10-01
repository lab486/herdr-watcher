import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parseClaudePrompt } from '../server/prompt-claude.js'

const fx = (name) => parseClaudePrompt(readFileSync(new URL(`./fixtures/${name}.txt`, import.meta.url), 'utf8'))
const labels = (p) => p.actions.map((a) => a.label)

test('bash permission', () => {
  const p = fx('claude-bash-permission')
  assert.equal(p.kind, 'permission')
  assert.equal(p.question, 'Do you want to proceed?')
  assert.equal(p.actions.length, 4)
  assert.equal(labels(p)[0], 'Yes')
  assert.equal(labels(p)[3], 'No')
  assert.deepEqual(p.actions[3].keys, ['4'])
  assert.ok(p.context.includes('mkdir -p ./demo-dir && echo hi > ./demo-dir/a.txt'))
  assert.ok(p.context.includes('Bash command'))
})

test('write permission', () => {
  const p = fx('claude-write-permission')
  assert.equal(p.question, 'Do you want to create notes.md?')
  assert.deepEqual(labels(p).length, 3)
  assert.ok(p.context.includes('Create file'))
})

test('AskUserQuestion single select with descriptions', () => {
  const p = fx('claude-ask-single')
  assert.equal(p.kind, 'question')
  assert.equal(p.question, 'Which color scheme?')
  assert.deepEqual(labels(p), ['Mocha', 'Latte', 'Frappe', 'Type something.', 'Chat about this'])
  assert.equal(p.actions[1].description, 'Latte color scheme')
})

test('AskUserQuestion multi select toggles and offers Next', () => {
  const p = fx('claude-ask-multi')
  assert.equal(p.kind, 'multiselect')
  assert.equal(p.question, 'Which toppings?')
  assert.deepEqual(labels(p), ['Cheese', 'Olives', 'Basil', 'Type something', 'Chat about this', 'Next'])
  assert.equal(p.actions[0].checked, false)
  assert.equal(p.actions[3].description, undefined)
  assert.deepEqual(p.actions.at(-1).keys, ['Right'])
})

test('wizard second question and submit review', () => {
  assert.equal(fx('claude-ask-wizard-q2').question, 'Which crust?')
  const s = fx('claude-ask-submit')
  assert.equal(s.question, 'Ready to submit your answers?')
  assert.deepEqual(labels(s), ['Submit answers', 'Cancel'])
})

test('unnumbered trust dialog uses arrows', () => {
  const p = fx('claude-trust')
  assert.deepEqual(labels(p), ['No, exit', 'Yes, I trust this folder'])
  assert.deepEqual(p.actions[0].keys, ['Enter'])
  assert.deepEqual(p.actions[1].keys, ['Down', 'Enter'])
})

test('fingerprint ignores checkbox state', () => {
  const a = readFileSync(new URL('./fixtures/claude-ask-multi.txt', import.meta.url), 'utf8')
  const b = a.replace('[ ] Cheese', '[✔] Cheese')
  assert.equal(parseClaudePrompt(a).fingerprint, parseClaudePrompt(b).fingerprint)
  assert.equal(parseClaudePrompt(b).actions[0].checked, true)
})

test('idle screen and plain numbered prose are not prompts', () => {
  assert.equal(parseClaudePrompt('❯ \n──────────\n  ⏸ manual mode on · ? for shortcuts'), null)
  assert.equal(parseClaudePrompt('⏺ Steps:\n  1. do a\n  2. do b\n\nsome trailing text'), null)
})
