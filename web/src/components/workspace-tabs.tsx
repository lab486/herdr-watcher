import type { Agent, Status, Workspace } from '@/lib/api'
import { href } from '@/lib/route'
import { needsAttention } from '@/lib/look'
import { cn } from '@/lib/utils'
import { StatusDot } from './status-dot'
import { WorkspaceBar } from './workspace-bar'

type Tab = { key: string; label: string; href: string; status: Status; color?: string; attention: number; active: boolean }

function rollup(agents: Agent[]): Status {
  for (const s of ['blocked', 'working', 'done', 'idle'] as const) if (agents.some((a) => a.status === s)) return s
  return 'unknown'
}

// Tabs wrap onto as many rows as they need; "All" always leads.
export function WorkspaceTabs({ workspaces, agents, activeId }: { workspaces: Workspace[]; agents: Agent[]; activeId: string | null }) {
  const tabs: Tab[] = [
    { key: 'all', label: 'All', href: href.all, status: rollup(agents), attention: agents.filter(needsAttention).length, active: activeId === null },
    ...workspaces.map((w) => {
      const mine = agents.filter((a) => a.workspaceId === w.id)
      return { key: w.id, label: w.label, href: href.workspace(w.id), status: w.status, color: w.color, attention: mine.filter(needsAttention).length, active: activeId === w.id }
    }),
  ]
  return (
    <nav aria-label="Workspaces" className="flex flex-wrap gap-1.5">
      {tabs.map((t) => (
        <a
          key={t.key}
          href={t.href}
          aria-current={t.active ? 'page' : undefined}
          className={cn(
            'flex min-h-10 items-center gap-2 rounded-lg border px-3 text-[15px] transition-colors',
            t.active ? 'border-transparent bg-surface text-foreground' : 'border-border text-subtext hover:text-foreground',
          )}
        >
          {t.color && <WorkspaceBar color={t.color} />}
          <StatusDot status={t.status} />
          <span className={cn(t.active && 'font-medium')}>{t.label}</span>
          {t.attention > 0 && <span className="tnum text-sm text-subtext">{t.attention}</span>}
        </a>
      ))}
    </nav>
  )
}
