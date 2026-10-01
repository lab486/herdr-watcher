// Polls herdr and keeps a compact view of workspaces and agents, with parsed prompts for blocked Claude panes.
import { EventEmitter } from 'node:events'
import { readPane, snapshot } from './herdr.js'
import { parseClaudePrompt } from './prompt-claude.js'

const POLL_MS = 1000

export function createState() {
  const events = new EventEmitter()
  let current = { workspaces: [], agents: [], error: null }
  let json = ''
  let timer = null

  async function promptFor(a) {
    // No cache: herdr's pane revision doesn't track screen content, and wizard steps change the screen while still blocked.
    if (a.agent !== 'claude' || a.agent_status !== 'blocked') return null
    return parseClaudePrompt((await readPane(a.pane_id)).text)
  }

  async function tick() {
    let next
    try {
      const snap = await snapshot()
      const agents = await Promise.all(
        snap.agents.map(async (a) => ({
          paneId: a.pane_id,
          workspaceId: a.workspace_id,
          agent: a.display_agent || a.agent,
          status: a.agent_status,
          title: a.terminal_title_stripped || a.title || '',
          cwd: a.cwd,
          sessionId: a.agent === 'claude' ? a.agent_session?.value ?? null : null,
          prompt: await promptFor(a).catch(() => null),
        })),
      )
      const workspaces = snap.workspaces.map((w) => ({ id: w.workspace_id, label: w.label, number: w.number, status: w.agent_status }))
      next = { workspaces, agents, error: null }
    } catch (e) {
      next = { ...current, error: `herdr unreachable: ${e.message}` }
    }
    const nextJson = JSON.stringify(next)
    if (nextJson !== json) {
      current = next
      json = nextJson
      events.emit('change', current)
    }
  }

  async function loop() {
    await tick()
    if (events.listenerCount('change')) timer = setTimeout(loop, POLL_MS)
    else timer = null
  }

  return {
    get: () => current,
    json: () => json,
    agent: (paneId) => current.agents.find((a) => a.paneId === paneId),
    refresh: tick,
    // Polls only while someone listens.
    subscribe(fn) {
      events.on('change', fn)
      if (!timer) loop()
      return () => events.off('change', fn)
    },
  }
}
