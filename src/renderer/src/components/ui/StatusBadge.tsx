import type { GameStatus } from '@shared/constants'

interface StatusBadgeProps {
  status: GameStatus
}

const STATUS_STYLES: Record<
  GameStatus,
  { bg: string; text: string; border: string }
> = {
  '未开始': {
    bg: 'bg-slate-700/60',
    text: 'text-slate-300',
    border: 'border-slate-600',
  },
  '游玩中': {
    bg: 'bg-teal-900/50',
    text: 'text-teal-300',
    border: 'border-teal-700/50',
  },
  '已通关': {
    bg: 'bg-emerald-900/50',
    text: 'text-emerald-300',
    border: 'border-emerald-700/50',
  },
  '搁置': {
    bg: 'bg-amber-900/50',
    text: 'text-amber-300',
    border: 'border-amber-700/50',
  },
  '弃坑': {
    bg: 'bg-red-900/50',
    text: 'text-red-300',
    border: 'border-red-700/50',
  },
  '已全成就': {
    bg: 'bg-amber-700/50',
    text: 'text-amber-200',
    border: 'border-amber-600/50',
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
      {status}
    </span>
  )
}
