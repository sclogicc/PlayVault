import type { GameStatus } from '@shared/constants'
import { GAME_STATUS_LABELS } from '@shared/constants'

interface StatusBadgeProps {
  status: GameStatus
}

const STATUS_STYLES: Record<
  GameStatus,
  { bg: string; text: string; border: string }
> = {
  not_started: {
    bg: 'bg-slate-700/60',
    text: 'text-slate-300',
    border: 'border-slate-600',
  },
  in_progress: {
    bg: 'bg-teal-900/50',
    text: 'text-teal-300',
    border: 'border-teal-700/50',
  },
  completed: {
    bg: 'bg-emerald-900/50',
    text: 'text-emerald-300',
    border: 'border-emerald-700/50',
  },
}

export default function StatusBadge({
  status,
}: StatusBadgeProps): React.ReactElement {
  const style = STATUS_STYLES[status]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${style.bg} ${style.text} ${style.border}`}
    >
      {GAME_STATUS_LABELS[status]}
    </span>
  )
}
