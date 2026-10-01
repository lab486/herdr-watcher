import type { AppState } from '@/lib/api'
import { byUrgency } from '@/lib/look'
import { href } from '@/lib/route'
import { AgentRow } from '@/components/agent-row'
import { WorkspaceTabs } from '@/components/workspace-tabs'

export function Board({ state, workspaceId }: { state: AppState; workspaceId: string | null }) {
  const wsById = new Map(state.workspaces.map((w) => [w.id, w]))
  const order = new Map(state.workspaces.map((w, i) => [w.id, i]))
  const agents = state.agents
    .filter((a) => !workspaceId || a.workspaceId === workspaceId)
    .sort((a, b) => byUrgency(a, b) || order.get(a.workspaceId)! - order.get(b.workspaceId)!)
  const blocked = state.agents.filter((a) => a.status === 'blocked').length
  const blockedHere = agents.filter((a) => a.status === 'blocked')
  const rest = agents.filter((a) => a.status !== 'blocked')

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <WorkspaceTabs workspaces={state.workspaces} agents={state.agents} activeId={workspaceId} />

      {workspaceId === null && blocked > 0 && (
        <a
          href={href.decisions}
          className="flex min-h-12 items-center justify-between rounded-xl bg-st-blocked px-4 font-medium text-on-status active:opacity-90"
        >
          <span>Answer {blocked === 1 ? 'the waiting question' : `${blocked} waiting questions`}</span>
          <span className="tnum rounded-md bg-on-status/20 px-2 py-0.5 text-sm">{blocked}</span>
        </a>
      )}

      {blockedHere.length > 0 && (
        <section aria-label="Waiting for you" className="grid gap-3 md:grid-cols-2">
          {blockedHere.map((a) => <AgentRow key={a.paneId} agent={a} workspace={wsById.get(a.workspaceId)} />)}
        </section>
      )}

      {rest.length > 0 && (
        <section aria-label="Agents" className="grid gap-x-4 gap-y-0.5 md:grid-cols-2">
          {rest.map((a) => <AgentRow key={a.paneId} agent={a} workspace={wsById.get(a.workspaceId)} />)}
        </section>
      )}

      {agents.length === 0 && (
        <p className="py-12 text-center text-subtext">
          No agents here yet. Start one in herdr and it shows up within a second.
        </p>
      )}
    </div>
  )
}
