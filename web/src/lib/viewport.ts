import { useEffect } from 'react'

// iOS Safari doesn't shrink dvh for the keyboard; mirror visualViewport height into --vvh instead.
export function useVisualViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const set = () => document.documentElement.style.setProperty('--vvh', `${vv.height}px`)
    set()
    vv.addEventListener('resize', set)
    return () => vv.removeEventListener('resize', set)
  }, [])
}
