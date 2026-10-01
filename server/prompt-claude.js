// Parse a blocked Claude Code dialog from the visible screen text.
// Returns { kind, question, context[], actions[{label, description?, checked?, keys[]}], fingerprint } or null.
import { createHash } from 'node:crypto'

const OPTION = /^\s*(?:❯\s*)?(\d+)\.\s+(.+?)\s*$/
const FOOTER = /esc to cancel|enter to (select|confirm)|to navigate/i
const RULE = /^\s*[─━╌]{8,}/
const HEAVY_RULE = /^\s*[─━]{8,}/
const CHECKBOX = /^\[([ ✔✓x×])\]\s*/

export function parseClaudePrompt(screen) {
  const lines = screen.split('\n').map((l) => l.replace(/\s+$/, ''))
  let i = lines.length - 1
  const skipBlank = () => { while (i >= 0 && !lines[i].trim()) i-- }

  skipBlank()
  if (i >= 0 && FOOTER.test(lines[i]) && !OPTION.test(lines[i])) i--
  skipBlank()
  if (i < 0) return null

  const numbered = collectNumbered(lines, i)
  const parsed = numbered ?? collectCursorList(lines, i)
  if (!parsed) return null
  const { actions, top } = parsed

  // The question is the nearest text line above the options; context is everything up to the dialog's top rule.
  let q = top - 1
  while (q >= 0 && (!lines[q].trim() || RULE.test(lines[q]))) q--
  const context = []
  let c = q - 1
  while (c >= 0 && !HEAVY_RULE.test(lines[c]) && context.length < 15) {
    if (lines[c].trim() && !RULE.test(lines[c])) context.unshift(lines[c].trim())
    c--
  }
  let question = q >= 0 ? lines[q].trim() : ''
  if (!numbered && context.length) question = context.shift() // cursor lists (trust dialog) put the title first

  const multi = actions.some((a) => a.checked !== undefined)
  if (multi) actions.push({ label: 'Next', keys: ['Right'], nav: true })
  const kind = multi ? 'multiselect' : /^do you want to/i.test(question) ? 'permission' : 'question'
  const fingerprint = createHash('sha1')
    .update([question, ...actions.map((a) => a.label)].join('\n'))
    .digest('hex')
    .slice(0, 12)
  return { kind, question, context, actions, fingerprint }
}

// Walk up from the bottom collecting "N. label" rows down to option 1. Indented non-option rows are descriptions.
function collectNumbered(lines, start) {
  const found = []
  let pending = []
  for (let i = start; i >= 0; i--) {
    const line = lines[i]
    const m = line.match(OPTION)
    if (m) {
      const n = Number(m[1])
      if (found.length && n !== found[0].n - 1) return null
      if (!found.length && pending.length) return null // something other than an option sits at the bottom
      let label = m[2]
      let checked
      const cb = label.match(CHECKBOX)
      if (cb) {
        checked = cb[1] !== ' '
        label = label.slice(cb[0].length)
      }
      const description = pending.filter((d) => d !== 'Next').join(' ') || undefined
      found.unshift({ n, label, description, checked, top: i })
      pending = []
      if (n === 1) {
        const actions = found.map(({ n, label, description, checked }) => ({ label, description, checked, keys: [String(n)] }))
        return { actions, top: i }
      }
    } else if (!line.trim() || RULE.test(line)) {
      continue
    } else if (/^\s{2,}/.test(line) && (found.length || pending.length < 3)) {
      pending.unshift(line.trim()) // indented description of the option above
    } else {
      return null
    }
  }
  return null
}

// Unnumbered list with a ❯ cursor (e.g. the folder trust dialog): navigate with arrows, then Enter.
function collectCursorList(lines, start) {
  const rows = []
  let i = start
  while (i >= 0 && lines[i].trim() && !RULE.test(lines[i])) rows.unshift({ text: lines[i], i: i-- })
  const cursorAt = rows.findIndex((r) => /^\s*❯\s/.test(r.text))
  if (cursorAt < 0) return null
  const indent = (s) => s.match(/^\s*/)[0].length
  const optionIndent = indent(rows[cursorAt].text)
  let first = cursorAt
  while (first > 0 && indent(rows[first - 1].text) >= optionIndent && !/[.:?]$/.test(rows[first - 1].text)) first--
  const opts = rows.slice(first)
  const actions = opts.map((r, idx) => {
    const d = idx - (cursorAt - first)
    return { label: r.text.replace(/^\s*❯?\s*/, ''), keys: [...Array(Math.abs(d)).fill(d > 0 ? 'Down' : 'Up'), 'Enter'] }
  })
  return { actions, top: opts[0].i }
}
