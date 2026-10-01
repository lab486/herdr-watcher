import type { ChatMessage, ToolPart } from '@/lib/api'
import { basename } from '@/lib/look'
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation'
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import { Tool, ToolContent, ToolHeader } from '@/components/ai-elements/tool'

function summary(t: ToolPart) {
  try {
    const i = JSON.parse(t.input)
    const s = i.command ?? (i.file_path && basename(i.file_path)) ?? i.pattern ?? i.url ?? i.description ?? i.questions?.[0]?.question
    return typeof s === 'string' ? `${t.name}  ${s.split('\n')[0]}` : t.name
  } catch {
    return t.name
  }
}

function ToolRow({ part }: { part: ToolPart }) {
  const state = part.output === undefined ? 'input-available' : part.error ? 'output-error' : 'output-available'
  return (
    <Tool className="mb-0 border-border bg-card">
      <ToolHeader type="dynamic-tool" toolName={part.name} state={state} title={summary(part)} className="gap-2 p-2.5 text-left [&_span]:truncate [&>div]:min-w-0" />
      <ToolContent className="space-y-2 p-2.5 pt-0">
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-crust/60 p-2 font-mono text-xs text-subtext">{part.input}</pre>
        {part.output !== undefined && (
          <pre className={`max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md p-2 font-mono text-xs ${part.error ? 'bg-st-blocked/10 text-st-blocked' : 'bg-crust/60 text-foreground'}`}>
            {part.output || '(no output)'}
          </pre>
        )}
      </ToolContent>
    </Tool>
  )
}

export function ChatView({ messages }: { messages: ChatMessage[] | null }) {
  if (!messages) return <p className="flex-1 p-4 text-subtext">Loading the conversation…</p>
  if (!messages.length) return <p className="flex-1 p-4 text-subtext">No messages yet. Send the first one below.</p>
  return (
    <Conversation className="flex-1">
      <ConversationContent className="mx-auto w-full max-w-3xl gap-5 px-4 py-4">
        {messages.map((m) => (
          <Message key={m.id} from={m.role} className="max-w-full">
            <MessageContent className="max-w-[min(100%,72ch)] text-base leading-relaxed group-[.is-user]:px-3.5 group-[.is-user]:py-2.5">
              {m.parts.map((p, i) =>
                p.type === 'text' ? (
                  m.role === 'user' ? <p key={i} className="whitespace-pre-wrap break-words">{p.text}</p> : <MessageResponse key={i}>{p.text}</MessageResponse>
                ) : (
                  <ToolRow key={p.id} part={p} />
                ),
              )}
            </MessageContent>
          </Message>
        ))}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}
