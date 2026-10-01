import { useState } from 'react'
import { Keyboard } from 'lucide-react'
import { sendKeys, sendPrompt, type Agent } from '@/lib/api'
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, PromptInputTools, PromptInputButton } from '@/components/ai-elements/prompt-input'
import { cn } from '@/lib/utils'

const KEYS: { label: string; keys: string[]; name: string }[] = [
  { label: 'Esc', keys: ['Escape'], name: 'Escape' },
  { label: '⌃C', keys: ['ctrl+c'], name: 'Control C' },
  { label: 'Tab', keys: ['Tab'], name: 'Tab' },
  { label: '⇧Tab', keys: ['shift+tab'], name: 'Shift Tab' },
  { label: '↑', keys: ['Up'], name: 'Up arrow' },
  { label: '↓', keys: ['Down'], name: 'Down arrow' },
  { label: '⏎', keys: ['Enter'], name: 'Enter' },
]

export function Composer({ agent }: { agent: Agent }) {
  const [status, setStatus] = useState<'ready' | 'submitted' | 'error'>('ready')
  const [error, setError] = useState<string | null>(null)
  const [showKeys, setShowKeys] = useState(false)

  const run = async (fn: () => Promise<unknown>) => {
    setError(null)
    setStatus('submitted')
    try {
      await fn()
      setStatus('ready')
    } catch (e) {
      setError((e as Error).message)
      setStatus('error')
      throw e
    }
  }

  return (
    <div className="border-t border-border bg-mantle px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {showKeys && (
        <div className="mb-2 flex gap-1.5 overflow-x-auto" role="toolbar" aria-label="Send keys">
          {KEYS.map((k) => (
            <button
              key={k.label}
              type="button"
              aria-label={k.name}
              onClick={() => run(() => sendKeys(agent.paneId, k.keys)).catch(() => {})}
              className="min-h-10 min-w-11 shrink-0 rounded-md border border-input bg-background px-2.5 font-mono text-sm active:bg-surface"
            >
              {k.label}
            </button>
          ))}
        </div>
      )}
      <PromptInput onSubmit={({ text }) => (text.trim() ? run(() => sendPrompt(agent.paneId, text)) : undefined)} className="bg-background">
        <PromptInputBody>
          <PromptInputTextarea
            enterKeyHint="send"
            placeholder={agent.status === 'blocked' ? 'Type an answer…' : `Message ${agent.agent}…`}
            className="min-h-11 text-base"
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputButton onClick={() => setShowKeys((v) => !v)} aria-pressed={showKeys} aria-label="Show key bar" className={cn(showKeys && 'bg-surface')}>
              <Keyboard className="size-4" /> Keys
            </PromptInputButton>
          </PromptInputTools>
          <PromptInputSubmit status={status === 'submitted' ? 'submitted' : undefined} />
        </PromptInputFooter>
      </PromptInput>
      {error && <p role="alert" className="mt-1.5 text-sm text-st-blocked">{error}</p>}
    </div>
  )
}
