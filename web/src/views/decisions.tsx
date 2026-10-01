import { lazy, Suspense, useState } from 'react'
import { X } from 'lucide-react'
import { usePaneStream, type Agent, type AppState } from '@/lib/api'
import { basename } from '@/lib/look'
import { href } from '@/lib/route'
import { PromptCard } from '@/components/prompt-card'
import { WorkspaceBar } from '@/components/workspace-bar'

const MessageResponse = lazy(() => import('@/components/ai-elements/message').then((m) => ({ default: m.MessageResponse })))

function LastWords({ agent }: { agent: Agent }) {
  const { messages } = usePaneStream(agent.paneId)
  const last = messages?.findLast((m) => m.role === 'assistant' && m.parts.some((p) => p.type === 'text'))
  const text = last?.parts.filter((p) => p.type === 'text').map((p) => p.text).join('\n\n')
  if (!text) return null
  return (
    <div className="max-h-[35vh] overflow-y-auto rounded-lg border border-border px-3 py-2 text-[15px] leading-relaxed text-subtext">
      <Suspense fallback={<p>{text}</p>}><MessageResponse>{text}</MessageResponse></Suspense>
    </div>
  )
}

// One waiting question at a time, across every workspace.
export function Decisions({ state }: { state: AppState }) {
  const [skipped, setSkipped] = useState<string[]>([])
  const order = new Map(state.workspaces.map((w, i) => [w.id, i]))
  const queue = state.agents.filter((a) => a.status === 'blocked').sort((a, b) => order.get(a.workspaceId)! - order.get(b.workspaceId)!)
  const current = queue.find((a) => !skipped.includes(a.paneId))
  const ws = current && state.workspaces.find((w) => w.id === current.workspaceId)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">
          Decisions <span className="tnum font-normal text-subtext">{queue.length ? `${queue.length} waiting` : ''}</span>
        </h1>
        <a href={href.all} aria-label="Close" className="flex size-10 items-center justify-center rounded-lg active:bg-surface">
          <X className="size-5" />
        </a>
      </header>

      {!queue.length && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg">All clear. No agent is waiting on you.</p>
          <a href={href.all} className="rounded-lg border border-input px-4 py-2.5">Back to all agents</a>
        </div>
      )}

      {queue.length > 0 && !current && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p>You skipped the remaining {queue.length === 1 ? 'question' : `${queue.length} questions`}.</p>
          <button type="button" onClick={() => setSkipped([])} className="rounded-lg border border-input px-4 py-2.5">Go through them again</button>
        </div>
      )}

      {current && (
        <article key={current.paneId} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <a href={href.agent(current.paneId)} className="flex gap-3">
            {ws && <WorkspaceBar color={ws.color} className="h-auto self-stretch" />}
            <span className="flex min-w-0 flex-col">
            <span className="font-medium">{current.title || current.paneId}</span>
            <span className="flex gap-3 text-sm text-subtext">
              {ws && <span style={{ color: ws.color }}>{ws.label}</span>}
              <span>{current.agent}</span>
              <span className="truncate">{basename(current.cwd)}</span>
            </span>
            </span>
          </a>
          {current.sessionId && <LastWords agent={current} />}
          <PromptCard agent={current} />
          <button type="button" onClick={() => setSkipped((s) => [...s, current.paneId])} className="min-h-11 self-start rounded-lg px-3 text-subtext active:bg-surface">
            Skip for now
          </button>
        </article>
      )}
    </div>
  )
}
