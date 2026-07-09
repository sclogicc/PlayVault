import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Image,
  EyeOff,
  CheckCircle,
  FolderOpen,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import type { Screenshot } from '@shared/types'
import type { ScreenshotStatus } from '@shared/constants'
import { SCREENSHOT_STATUSES } from '@shared/constants'
import Button from '../components/ui/Button'

const STATUS_LABELS: Record<ScreenshotStatus, string> = {
  pending: '待整理',
  classified: '已归类',
  ignored: '已忽略',
}

export default function Screenshots(): React.ReactElement {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<ScreenshotStatus | '全部'>('全部')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const { data: screenshots = [], isLoading } = useQuery<Screenshot[]>({
    queryKey: ['screenshots', statusFilter],
    queryFn: () =>
      window.api.screenshot.getAll(
        statusFilter !== '全部' ? { status: statusFilter } : undefined,
      ),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      gameId,
    }: {
      id: number
      status: ScreenshotStatus
      gameId?: number | null
    }) => window.api.screenshot.updateStatus(id, status, gameId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['screenshots'] })
    },
  })

  const batchUpdateMutation = useMutation({
    mutationFn: ({
      ids,
      status,
    }: {
      ids: number[]
      status: ScreenshotStatus
    }) => window.api.screenshot.batchUpdate(ids, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['screenshots'] })
      setSelectedIds(new Set())
    },
  })

  const rematchMutation = useMutation({
    mutationFn: () => window.api.screenshot.rematch(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['screenshots'] })
    },
  })

  const toggleSelect = (id: number): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = (): void => {
    if (selectedIds.size === screenshots.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(screenshots.map((s) => s.id)))
    }
  }

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr)
    return d.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const openFileLocation = (filePath: string): void => {
    // Use shell.openPath via IPC — for now, just show path
    console.log('Open:', filePath)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-archive-100">截图箱</h2>
          <p className="text-sm text-archive-500 mt-0.5">
            {screenshots.length} 张截图
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  batchUpdateMutation.mutate({
                    ids: Array.from(selectedIds),
                    status: 'classified',
                  })
                }
              >
                <CheckCircle size={14} />
                批量归类
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  batchUpdateMutation.mutate({
                    ids: Array.from(selectedIds),
                    status: 'ignored',
                  })
                }
              >
                <EyeOff size={14} />
                批量忽略
              </Button>
            </>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => rematchMutation.mutate()}
            disabled={rematchMutation.isPending}
          >
            {rematchMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            重新匹配
          </Button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {(
          [
            { value: '全部' as const, label: '全部' },
            ...SCREENSHOT_STATUSES.map((s) => ({
              value: s,
              label: STATUS_LABELS[s],
            })),
          ] as Array<{ value: string; label: string }>
        ).map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setStatusFilter(opt.value as ScreenshotStatus | '全部')
              setSelectedIds(new Set())
            }}
            className={`px-3 py-1.5 text-xs rounded-archive border transition-colors ${
              statusFilter === opt.value
                ? 'bg-accent-teal/20 text-accent-teal border-accent-teal/30'
                : 'bg-archive-800 text-archive-400 border-archive-700/50 hover:text-archive-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Screenshot grid */}
      {isLoading ? (
        <div className="card text-center py-12">
          <Loader2 size={24} className="animate-spin text-archive-500 mx-auto mb-3" />
          <p className="text-archive-500">加载中...</p>
        </div>
      ) : screenshots.length === 0 ? (
        <div className="card text-center py-16">
          <Image size={48} className="text-archive-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-archive-400 mb-2">
            {statusFilter === '全部' ? '暂无截图' : `暂无${STATUS_LABELS[statusFilter as ScreenshotStatus]}截图`}
          </h3>
          <p className="text-archive-600 text-sm">
            {statusFilter === '全部'
              ? '在设置中配置截图目录，系统将自动监听新截图'
              : ''}
          </p>
        </div>
      ) : (
        <>
          {/* Select all bar */}
          <div className="flex items-center gap-2 text-sm text-archive-400">
            <input
              type="checkbox"
              checked={
                screenshots.length > 0 &&
                selectedIds.size === screenshots.length
              }
              onChange={toggleSelectAll}
              className="rounded"
            />
            <span>
              {selectedIds.size > 0
                ? `已选 ${selectedIds.size} 张`
                : '全选'}
            </span>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-4 gap-3">
            {screenshots.map((shot) => (
              <div
                key={shot.id}
                className={`card !p-0 overflow-hidden group relative cursor-pointer ${
                  selectedIds.has(shot.id)
                    ? 'ring-2 ring-accent-teal'
                    : ''
                }`}
                onClick={() => toggleSelect(shot.id)}
              >
                {/* Thumbnail placeholder — real image rendering with file:// */}
                <div className="aspect-video bg-archive-850 flex items-center justify-center">
                  <Image size={32} className="text-archive-700" />
                </div>
                {/* Overlay info */}
                <div className="p-2">
                  <p
                    className="text-xs text-archive-300 truncate"
                    title={shot.file_name}
                  >
                    {shot.file_name}
                  </p>
                  <p className="text-[10px] text-archive-500 mt-0.5">
                    {formatDate(shot.captured_at)}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        shot.status === 'classified'
                          ? 'bg-accent-teal/15 text-accent-teal'
                          : shot.status === 'ignored'
                            ? 'bg-archive-600/30 text-archive-500'
                            : 'bg-accent-gold/10 text-accent-gold'
                      }`}
                    >
                      {STATUS_LABELS[shot.status]}
                    </span>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {shot.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            updateStatusMutation.mutate({
                              id: shot.id,
                              status: 'classified',
                            })
                          }}
                          className="p-1 text-accent-teal hover:bg-accent-teal/10 rounded"
                          title="归类"
                        >
                          <CheckCircle size={12} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          updateStatusMutation.mutate({
                            id: shot.id,
                            status:
                              shot.status === 'ignored' ? 'pending' : 'ignored',
                          })
                        }}
                        className="p-1 text-archive-400 hover:text-archive-200 rounded"
                        title={
                          shot.status === 'ignored' ? '取消忽略' : '忽略'
                        }
                      >
                        <EyeOff size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openFileLocation(shot.file_path)
                        }}
                        className="p-1 text-archive-400 hover:text-archive-200 rounded"
                        title="打开位置"
                      >
                        <FolderOpen size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
