import type { Status } from '@/lib/api'
import { STATUS } from '@/lib/look'
import { cn } from '@/lib/utils'

// herdr's sidebar glyphs: filled for working/blocked/done, hollow for idle.
export function StatusDot({ status, className }: { status: Status; className?: string }) {
  const s = STATUS[status]
  return (
    <span
      role="img"
      aria-label={s.label}
      title={s.label}
      className={cn('inline-block size-2.5 shrink-0 rounded-full', status === 'blocked' && 'pulse-blocked', className)}
      style={s.hollow ? { boxShadow: `inset 0 0 0 1.5px ${s.color}` } : { background: s.color }}
    />
  )
}
