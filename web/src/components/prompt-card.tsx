import { useState } from 'react'
import { Check, LoaderCircle } from 'lucide-react'
import { answer, type Agent } from '@/lib/api'
import { cn } from '@/lib/utils'

// The question a blocked agent is asking, with one large button per option.
export function PromptCard({ agent, onAnswered, compact }: { agent: Agent; onAnswered?: () => void; compact?: boolean }) {
  const prompt = agent.prompt
  const [pending, setPending] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!prompt) {
    return (
      <p className="text-subtext">
        This agent is waiting on something the watcher can’t read as options. Open the terminal to answer it.
      </p>
    )
  }
  const pick = async (i: number) => {
    setPending(i)
    setError(null)
    try {
      await answer(agent.paneId, prompt.fingerprint, i)
      if (!prompt.actions[i].nav && prompt.kind !== 'multiselect') onAnswered?.()
    } catch (e) {
      const err = e as Error & { status?: number }
      setError(err.status === 409 ? 'The question changed before your answer arrived. Check the new options.' : err.message)
    } finally {
      setPending(null)
    }
  }
  const context = compact ? prompt.context.slice(-3) : prompt.context
  return (
    <div className="flex flex-col gap-3">
      {context.length > 0 && (
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-crust/60 px-3 py-2 font-mono text-[13px] leading-snug text-subtext">
          {context.join('\n')}
        </pre>
      )}
      <p className="text-[17px] font-medium leading-snug text-foreground">{prompt.question}</p>
      <div className="flex flex-col gap-2">
        {prompt.actions.map((a, i) => (
          <button
            key={i}
            type="button"
            disabled={pending !== null}
            onClick={() => pick(i)}
            className={cn(
              'flex min-h-12 items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors active:bg-surface disabled:opacity-60',
              a.nav ? 'border-dashed border-input text-subtext' : 'border-input bg-background hover:bg-surface/60',
              a.checked && 'border-st-done/60 bg-st-done/10',
            )}
          >
            {a.checked !== undefined && (
              <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border', a.checked ? 'border-st-done bg-st-done text-on-status' : 'border-input')}>
                {a.checked && <Check className="size-3.5" strokeWidth={3} />}
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="break-words">{a.label}</span>
              {a.description && !compact && <span className="text-sm text-subtext">{a.description}</span>}
            </span>
            {pending === i && <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-subtext" />}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-st-blocked">{error}</p>}
    </div>
  )
}
