import type { Agent, Workspace } from '@/lib/api'
import { href } from '@/lib/route'
import { basename, STATUS } from '@/lib/look'
import { PromptCard } from './prompt-card'
import { StatusDot } from './status-dot'
import { WorkspaceBar } from './workspace-bar'

function Meta({ agent, workspace }: { agent: Agent; workspace?: Workspace }) {
  return (
    <span className="flex min-w-0 gap-3 text-sm text-subtext">
      {workspace && <span className="shrink-0" style={{ color: workspace.color }}>{workspace.label}</span>}
      <span className="shrink-0">{agent.agent}</span>
      <span className="truncate">{basename(agent.cwd)}</span>
    </span>
  )
}

// Blocked agents get the full question inline; everything else is a single dense row.
export function AgentRow({ agent, workspace }: { agent: Agent; workspace?: Workspace }) {
  const color = workspace ? workspace.color : 'var(--color-surface)'
  if (agent.status === 'blocked') {
    return (
      <article className="flex flex-col gap-3 rounded-xl border border-st-blocked/35 bg-card p-4">
        <a href={href.agent(agent.paneId)} className="flex min-w-0 gap-3">
          <WorkspaceBar color={color} className="h-auto self-stretch" />
          <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2.5">
            <StatusDot status="blocked" />
            <span className="truncate font-medium">{agent.title || agent.paneId}</span>
          </span>
          <Meta agent={agent} workspace={workspace} />
          </span>
        </a>
        <PromptCard agent={agent} compact />
      </article>
    )
  }
  return (
    <a
      href={href.agent(agent.paneId)}
      className="flex min-h-14 items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-card active:bg-card"
    >
      <WorkspaceBar color={color} className="h-9" />
      <StatusDot status={agent.status} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{agent.title || agent.paneId}</span>
        <Meta agent={agent} workspace={workspace} />
      </span>
      <span className="shrink-0 text-sm" style={{ color: STATUS[agent.status].color }}>{STATUS[agent.status].label}</span>
    </a>
  )
}
