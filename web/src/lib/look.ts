import type { Agent, Status, Workspace } from './api'

// Workspace hues from catppuccin mocha, chosen to never collide with the status colors.
// Values live in index.css (--ws-N) so they follow the light/dark theme.
const HUES = [0, 1, 2, 3, 4, 5].map((i) => `var(--ws-${i})`)

const hash = (s: string) => {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.codePointAt(0)!, 16777619)
  return h >>> 0
}

// Each workspace prefers the hue its label hashes to; on a collision it takes the next free one.
// Assigned in herdr's workspace order, so adding a workspace never recolors an earlier one.
export function workspaceColors(workspaces: Workspace[]) {
  const colors = new Map<string, string>()
  const used = new Set<number>()
  for (const w of [...workspaces].sort((a, b) => a.number - b.number)) {
    let i = hash(w.label) % HUES.length
    for (let n = 0; n < HUES.length && used.has(i); n++) i = (i + 1) % HUES.length
    used.add(i)
    if (used.size >= HUES.length) used.clear()
    colors.set(w.id, HUES[i])
  }
  return colors
}

export const STATUS: Record<Status, { color: string; label: string; rank: number; hollow?: boolean }> = {
  blocked: { color: 'var(--color-st-blocked)', label: 'Needs you', rank: 0 },
  done: { color: 'var(--color-st-done)', label: 'Done', rank: 1 },
  working: { color: 'var(--color-st-working)', label: 'Working', rank: 2 },
  idle: { color: 'var(--color-st-idle)', label: 'Idle', rank: 3, hollow: true },
  unknown: { color: 'var(--color-st-unknown)', label: 'Unknown', rank: 4, hollow: true },
}

export const needsAttention = (a: Agent) => a.status === 'blocked' || a.status === 'done'

export const byUrgency = (a: Agent, b: Agent) => STATUS[a.status].rank - STATUS[b.status].rank

export const basename = (p: string) => p.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || p
