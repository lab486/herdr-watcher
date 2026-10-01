import { useAppState } from '@/lib/api'
import { useRoute } from '@/lib/route'
import { useVisualViewportHeight } from '@/lib/viewport'
import { AgentView } from '@/views/agent-view'
import { Board } from '@/views/board'
import { Decisions } from '@/views/decisions'

export default function App() {
  const { state, connected } = useAppState()
  const route = useRoute()
  useVisualViewportHeight()

  const problem = !connected ? 'Lost the connection to the watcher. Retrying…' : state?.error
  return (
    <>
      {problem && <div role="status" className="border-b border-st-working/50 bg-st-working/15 px-4 py-2 text-sm text-foreground">{problem}</div>}
      {!state ? (
        <p className="p-6 text-subtext">Connecting to herdr…</p>
      ) : route.name === 'agent' ? (
        <AgentView state={state} paneId={route.paneId} />
      ) : route.name === 'decisions' ? (
        <Decisions state={state} />
      ) : (
        <Board state={state} workspaceId={route.workspaceId} />
      )}
    </>
  )
}
