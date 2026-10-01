import { useSyncExternalStore } from 'react'

export type Route =
  | { name: 'board'; workspaceId: string | null }
  | { name: 'agent'; paneId: string }
  | { name: 'decisions' }

function parse(hash: string): Route {
  const [, kind, id] = hash.replace(/^#/, '').split('/')
  if (kind === 'a' && id) return { name: 'agent', paneId: decodeURIComponent(id) }
  if (kind === 'w' && id) return { name: 'board', workspaceId: decodeURIComponent(id) }
  if (kind === 'decisions') return { name: 'decisions' }
  return { name: 'board', workspaceId: null }
}

const subscribe = (fn: () => void) => {
  window.addEventListener('hashchange', fn)
  return () => window.removeEventListener('hashchange', fn)
}

export const useRoute = () => parse(useSyncExternalStore(subscribe, () => location.hash))

export const href = {
  all: '#/',
  workspace: (id: string) => `#/w/${encodeURIComponent(id)}`,
  agent: (paneId: string) => `#/a/${encodeURIComponent(paneId)}`,
  decisions: '#/decisions',
}
