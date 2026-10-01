import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import type { Screen } from '@/lib/api'

const THEME = {
  background: '#1e1e2e', foreground: '#cdd6f4', cursor: '#1e1e2e', selectionBackground: '#585b70',
  black: '#45475a', red: '#f38ba8', green: '#a6e3a1', yellow: '#f9e2af', blue: '#89b4fa', magenta: '#f5c2e7', cyan: '#94e2d5', white: '#bac2de',
  brightBlack: '#585b70', brightRed: '#f38ba8', brightGreen: '#a6e3a1', brightYellow: '#f9e2af', brightBlue: '#89b4fa', brightMagenta: '#f5c2e7', brightCyan: '#94e2d5', brightWhite: '#a6adc8',
}

// Read-only mirror of the pane's visible screen. Sized to the pane; scrolls sideways on narrow phones.
export function TerminalView({ screen }: { screen: Screen | null }) {
  const host = useRef<HTMLDivElement>(null)
  const term = useRef<Terminal | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = new Terminal({
      disableStdin: true, cursorBlink: false, cursorStyle: 'bar', cursorInactiveStyle: 'none', scrollback: 0,
      fontFamily: '"IBM Plex Mono", ui-monospace, Menlo, monospace', fontSize: 12, lineHeight: 1.15, theme: THEME,
    })
    t.open(host.current!)
    term.current = t
    return () => t.dispose()
  }, [])

  useEffect(() => {
    const t = term.current
    if (!t || !screen) return
    if (t.cols !== screen.cols || t.rows !== screen.rows) t.resize(screen.cols, Math.max(1, screen.rows))
    const box = scroller.current!
    const stick = !box.dataset.seen || box.scrollHeight - box.scrollTop - box.clientHeight < 40
    box.dataset.seen = '1'
    t.write('\x1b[H\x1b[2J\x1b[0m' + screen.ansi.replace(/\r?\n/g, '\r\n').replace(/\r\n$/, ''), () => {
      if (stick) box.scrollTop = box.scrollHeight
    })
  }, [screen])

  return (
    // Always dark: agents emit truecolor for their own (usually dark) theme, so a light ground would hide text.
    <div ref={scroller} className="flex-1 overflow-auto overscroll-contain bg-[#1e1e2e] px-3 py-2 text-[#a6adc8]">
      <div ref={host} className="w-max" inert />
      {!screen && <p>Reading the screen…</p>}
    </div>
  )
}
