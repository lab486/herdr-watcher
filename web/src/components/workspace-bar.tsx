import { cn } from '@/lib/utils'

export const WorkspaceBar = ({ color, className }: { color: string; className?: string }) => (
  <span aria-hidden className={cn('h-4 w-1 shrink-0 rounded-full', className)} style={{ background: color }} />
)
