import { lazy, Suspense, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { usePaneStream, type AppState } from '@/lib/api'
import { STATUS } from '@/lib/look'
import { href } from '@/lib/route'
import { cn } from '@/lib/utils'
import { Composer } from '@/components/composer'
import { PromptCard } from '@/components/prompt-card'
import { StatusDot } from '@/components/status-dot'
import { TerminalView } from '@/components/terminal-view'

const ChatView = lazy(() => import('@/components/chat-view').then((m) => ({ default: m.ChatView })))

export function AgentView({ state, paneId }: { state: AppState; paneId: string }) {
  const agent = state.agents.find((a) => a.paneId === paneId)
  const { screen, messages } = usePaneStream(paneId)
  const [tab, setTab] = useState<'chat' | 'terminal' | null>(null)
  if (!agent) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <p>This agent is gone. Its pane closed or the agent exited.</p>
        <a href={href.all} className="underline">Back to all agents</a>
      </div>
    )
  }
  const ws = state.workspaces.find((w) => w.id === agent.workspaceId)
  const view = tab ?? (agent.sessionId ? 'chat' : 'terminal')
  const back = ws ? href.workspace(ws.id) : href.all

  return (
    <div className="flex flex-col" style={{ height: 'var(--vvh, 100dvh)' }}>
      <header className="flex flex-col gap-2 border-b border-border bg-mantle px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center gap-1">
          <a href={back} aria-label="Back" className="flex size-10 shrink-0 items-center justify-center rounded-lg active:bg-surface">
            <ChevronLeft className="size-5" />
          </a>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-2">
              <StatusDot status={agent.status} />
              <span className="truncate font-medium">{agent.title || agent.paneId}</span>
            </span>
            <span className="flex gap-3 text-sm text-subtext">
              {ws && <span style={{ color: ws.color }}>{ws.label}</span>}
              <span>{agent.agent}</span>
              <span style={{ color: STATUS[agent.status].color }}>{STATUS[agent.status].label}</span>
            </span>
          </div>
        </div>
        <div role="tablist" className="mx-2 grid grid-cols-2 rounded-lg bg-background p-0.5">
          {(['chat', 'terminal'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={view === t}
              disabled={t === 'chat' && !agent.sessionId}
              onClick={() => setTab(t)}
              className={cn('min-h-9 rounded-md text-[15px] capitalize disabled:opacity-40', view === t ? 'bg-surface font-medium' : 'text-subtext')}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {view === 'chat' ? <Suspense fallback={null}><ChatView messages={messages} /></Suspense> : <TerminalView screen={screen} />}
      </main>

      {agent.status === 'blocked' && (
        <section aria-label="Waiting for you" className="max-h-[50%] shrink-0 overflow-y-auto border-t border-st-blocked/40 bg-card px-4 py-3">
          <PromptCard agent={agent} />
        </section>
      )}
      <Composer agent={agent} />
    </div>
  )
}
