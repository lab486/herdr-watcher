import { useEffect, useState } from 'react'
import { workspaceColors } from './look'

export type Status = 'idle' | 'working' | 'blocked' | 'done' | 'unknown'
export type Action = { label: string; description?: string; checked?: boolean; nav?: boolean; keys: string[] }
export type Prompt = { kind: 'permission' | 'question' | 'multiselect'; question: string; context: string[]; actions: Action[]; fingerprint: string }
export type Agent = { paneId: string; workspaceId: string; agent: string; status: Status; title: string; cwd: string; sessionId: string | null; prompt: Prompt | null }
export type Workspace = { id: string; label: string; number: number; status: Status; color: string }
export type AppState = { workspaces: Workspace[]; agents: Agent[]; error: string | null }
export type ToolPart = { type: 'tool'; id: string; name: string; input: string; output?: string; error?: boolean }
export type ChatMessage = { id: string; role: 'user' | 'assistant'; parts: ({ type: 'text'; text: string } | ToolPart)[] }
export type Screen = { ansi: string; cols: number; rows: number }

// EventSource reconnects on its own; `connected` drives the offline banner.
export function useAppState() {
  const [state, setState] = useState<AppState | null>(null)
  const [connected, setConnected] = useState(true)
  useEffect(() => {
    const es = new EventSource('/api/state')
    es.addEventListener('state', (e) => {
      const next: AppState = JSON.parse(e.data)
      const colors = workspaceColors(next.workspaces)
      for (const w of next.workspaces) w.color = colors.get(w.id)!
      setState(next)
    })
    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)
    return () => es.close()
  }, [])
  return { state, connected }
}

export function usePaneStream(paneId: string) {
  const [screen, setScreen] = useState<Screen | null>(null)
  const [messages, setMessages] = useState<ChatMessage[] | null>(null)
  useEffect(() => {
    setScreen(null)
    setMessages(null)
    const es = new EventSource(`/api/panes/${encodeURIComponent(paneId)}/stream`)
    es.addEventListener('screen', (e) => setScreen(JSON.parse(e.data)))
    es.addEventListener('messages', (e) => setMessages(JSON.parse(e.data)))
    return () => es.close()
  }, [paneId])
  return { screen, messages }
}

async function post(paneId: string, action: string, body: unknown) {
  const res = await fetch(`/api/panes/${encodeURIComponent(paneId)}/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error ?? res.statusText), { status: res.status })
  return data
}

export const sendPrompt = (paneId: string, text: string) => post(paneId, 'prompt', { text })
export const sendKeys = (paneId: string, keys: string[]) => post(paneId, 'keys', { keys })
export const answer = (paneId: string, fingerprint: string, index: number) => post(paneId, 'answer', { fingerprint, index })
