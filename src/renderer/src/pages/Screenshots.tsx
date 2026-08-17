/* 视觉基线：16:9 截图保持画面优先，筛选和归属操作收进冷墨玻璃工具层。 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, FolderOpen, Image, Loader2, Trash2, Undo2 } from 'lucide-react'
import type { GameWithStats, Screenshot } from '@shared/types'
import { SCREENSHOT_STATUS_LABELS } from '@shared/constants'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ImageViewer from '../components/ui/ImageViewer'
import Modal from '../components/ui/Modal'
import ScreenshotFrame from '../components/media/ScreenshotFrame'

type TabKey = 'all' | 'pending' | 'classified' | 'trashed'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: '\u5168\u90e8' },
  { key: 'pending', label: '\u5f85\u6574\u7406' },
  { key: 'classified', label: '\u5df2\u5f52\u7c7b' },
  { key: 'trashed', label: '\u56de\u6536\u7ad9' },
]

export default function Screenshots(): React.ReactElement {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [classifyIds, setClassifyIds] = useState<number[]>([])
  const [targetGameId, setTargetGameId] = useState<string>('')
  const [permanentDeletingId, setPermanentDeletingId] = useState<number | null>(null)
  const [emptyingTrash, setEmptyingTrash] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  const { data: screenshots = [], isLoading } = useQuery<Screenshot[]>({
    queryKey: ['screenshots', activeTab],
    queryFn: () => window.api.screenshot.getAll({ status: activeTab }),
  })
  const { data: games = [] } = useQuery<GameWithStats[]>({
    queryKey: ['games', 'screenshot-classification'],
    queryFn: () => window.api.game.getAll(),
  })

  const invalidate = (): void => {
    queryClient.invalidateQueries({ queryKey: ['screenshots'] })
    queryClient.invalidateQueries({ queryKey: ['games'] })
  }

  const classifyMutation = useMutation({
    mutationFn: async ({ ids, gameId }: { ids: number[]; gameId: number }) => {
      if (ids.length === 1) {
        await window.api.screenshot.updateStatus(ids[0], 'classified', gameId)
        return
      }
      await window.api.screenshot.batchUpdate(ids, 'classified', gameId)
    },
    onSuccess: () => {
      invalidate()
      setSelectedIds(new Set())
      setClassifyIds([])
      setTargetGameId('')
    },
  })
  const trashMutation = useMutation({
    mutationFn: (id: number) => window.api.screenshot.trash(id),
    onSuccess: invalidate,
  })
  const batchTrashMutation = useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map((id) => window.api.screenshot.trash(id))),
    onSuccess: () => {
      invalidate()
      setSelectedIds(new Set())
    },
  })
  const clearClassificationMutation = useMutation({
    mutationFn: (ids: number[]) => window.api.screenshot.batchUpdate(ids, 'pending'),
    onSuccess: () => {
      invalidate()
      setSelectedIds(new Set())
    },
  })
  const restoreMutation = useMutation({
    mutationFn: (id: number) => window.api.screenshot.restore(id),
    onSuccess: invalidate,
  })
  const batchRestoreMutation = useMutation({
    mutationFn: (ids: number[]) => window.api.screenshot.batchUpdate(ids, 'pending'),
    onSuccess: () => {
      invalidate()
      setSelectedIds(new Set())
    },
  })
  const permanentDeleteMutation = useMutation({
    mutationFn: (id: number) => window.api.screenshot.permanentDelete(id),
    onSuccess: () => {
      invalidate()
      setPermanentDeletingId(null)
    },
  })
  const emptyTrashMutation = useMutation({
    mutationFn: (ids: number[]) => window.api.screenshot.permanentDeleteMany(ids),
    onSuccess: () => {
      invalidate()
      setSelectedIds(new Set())
      setEmptyingTrash(false)
    },
  })

  const openClassification = (ids: number[]): void => {
    setClassifyIds(ids)
    setTargetGameId('')
  }

  const submitClassification = (): void => {
    const gameId = Number(targetGameId)
    if (!gameId || classifyIds.length === 0) return
    classifyMutation.mutate({ ids: classifyIds, gameId })
  }

  const toggleSelect = (id: number): void => {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = (): void => {
    setSelectedIds((previous) =>
      previous.size === screenshots.length
        ? new Set()
        : new Set(screenshots.map((screenshot) => screenshot.id)),
    )
  }

  const formatDate = (date: string): string =>
    new Date(date).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const isTrash = activeTab === 'trashed'

  return (
    <div className="pv-page scene-archive-media-page space-y-5">
      <header className="pv-page-header scene-archive-media-header">
        <div>
          <p className="eyebrow">图片资产</p>
          <h1 className="pv-page-title">截图箱</h1>
          <p className="pv-page-copy">已显示 {screenshots.length} 张截图，用画面串联你的游戏记忆。</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (isTrash ? (
            <Button variant="primary" size="sm" onClick={() => batchRestoreMutation.mutate(Array.from(selectedIds))}>
              <Undo2 size={14} />
              恢复所选
            </Button>
          ) : (
            <>
              <Button variant="primary" size="sm" onClick={() => openClassification(Array.from(selectedIds))}>
                <CheckCircle size={14} />
                重新归类
              </Button>
              <Button variant="secondary" size="sm" onClick={() => clearClassificationMutation.mutate(Array.from(selectedIds))}>
                <Undo2 size={14} />
                清除归属
              </Button>
              <Button variant="secondary" size="sm" onClick={() => batchTrashMutation.mutate(Array.from(selectedIds))}>
                <Trash2 size={14} />
                移入回收站
              </Button>
            </>
          ))}
          {isTrash && screenshots.length > 0 && (
            <Button variant="danger" size="sm" onClick={() => setEmptyingTrash(true)}>
              <Trash2 size={14} />
              清空回收站
            </Button>
          )}
        </div>
      </header>

      <div className="pv-toolbar flex flex-wrap gap-1.5 p-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key)
              setSelectedIds(new Set())
            }}
            data-active={activeTab === tab.key}
            className="pv-segment px-3 py-2 text-xs font-medium"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : screenshots.length === 0 ? (
        <EmptyState isTrash={isTrash} />
      ) : (
        <>
          <label className="inline-flex items-center gap-2 text-sm text-archive-400 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size > 0 && selectedIds.size === screenshots.length}
              onChange={toggleSelectAll}
              className="rounded"
            />
            {selectedIds.size > 0 ? `已选择 ${selectedIds.size} 张` : '全选'}
          </label>
          <div className="media-contact-sheet">
            {screenshots.map((shot, index) => (
              <ScreenshotCard
                key={shot.id}
                shot={shot}
                selected={selectedIds.has(shot.id)}
                isTrash={isTrash}
                gameName={games.find((game) => game.id === shot.game_id)?.display_name}
                onToggle={() => toggleSelect(shot.id)}
                onClassify={() => openClassification([shot.id])}
                onClearClassification={() => clearClassificationMutation.mutate([shot.id])}
                onTrash={() => trashMutation.mutate(shot.id)}
                onRestore={() => restoreMutation.mutate(shot.id)}
                onPermanentDelete={() => setPermanentDeletingId(shot.id)}
                onPreview={() => setPreviewIndex(index)}
                formatDate={formatDate}
              />
            ))}
          </div>
        </>
      )}

      <Modal
        open={classifyIds.length > 0}
        onClose={() => setClassifyIds([])}
        title="归类截图"
      >
        <div className="space-y-4">
          <p className="text-sm text-archive-400">
            将 {classifyIds.length} 张截图归类到游戏。归类后的截图会显示在对应游戏的档案页中。
          </p>
          <select
            value={targetGameId}
            onChange={(event) => setTargetGameId(event.target.value)}
            className="input-field w-full"
          >
            <option value="">请选择游戏</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.display_name}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setClassifyIds([])}>取消</Button>
            <Button
              variant="primary"
              disabled={!targetGameId || classifyMutation.isPending}
              onClick={submitClassification}
            >
              {classifyMutation.isPending ? '归类中...' : '确认归类'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={permanentDeletingId !== null}
        onClose={() => setPermanentDeletingId(null)}
        onConfirm={() => permanentDeletingId !== null && permanentDeleteMutation.mutate(permanentDeletingId)}
        title="永久删除截图"
        message="此操作会永久删除 PlayVault 中的截图记录，但不会删除磁盘中的原始图片文件。"
        confirmLabel="永久删除"
        variant="danger"
      />

      <ConfirmDialog
        open={emptyingTrash}
        onClose={() => setEmptyingTrash(false)}
        onConfirm={() => emptyTrashMutation.mutate(screenshots.map((shot) => shot.id))}
        title="清空回收站"
        message={`将永久删除回收站中的 ${screenshots.length} 张截图记录。原始图片文件不会被删除，但这些截图之后不会再在 PlayVault 中显示。`}
        confirmLabel="永久清空"
        variant="danger"
      />

      <ImageViewer
        open={previewIndex !== null}
        items={screenshots.map((shot) => ({
          filePath: shot.file_path,
          fileName: shot.file_name,
        }))}
        activeIndex={previewIndex ?? 0}
        onIndexChange={setPreviewIndex}
        onClose={() => setPreviewIndex(null)}
      />
    </div>
  )
}

function LoadingState(): React.ReactElement {
  return (
    <div className="card text-center py-12">
      <Loader2 size={24} className="animate-spin text-archive-500 mx-auto mb-3" />
      <p className="text-archive-500">加载中...</p>
    </div>
  )
}

function EmptyState({ isTrash }: { isTrash: boolean }): React.ReactElement {
  return (
    <div className="empty-state py-10">
      <Image size={48} className="text-archive-700 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-archive-400 mb-2">
        {isTrash ? '回收站为空' : '暂无截图'}
      </h3>
      <p className="text-archive-600 text-sm">
        {isTrash ? '移入回收站的截图会显示在这里。' : '配置截图目录后，新截图会显示在这里。'}
      </p>
    </div>
  )
}

function ScreenshotCard({
  shot,
  selected,
  isTrash,
  gameName,
  onToggle,
  onClassify,
  onClearClassification,
  onTrash,
  onRestore,
  onPermanentDelete,
  onPreview,
  formatDate,
}: {
  shot: Screenshot
  selected: boolean
  isTrash: boolean
  gameName?: string
  onToggle: () => void
  onClassify: () => void
  onClearClassification: () => void
  onTrash: () => void
  onRestore: () => void
  onPermanentDelete: () => void
  onPreview: () => void
  formatDate: (date: string) => string
}): React.ReactElement {
  return (
    <div
      className={'scene-archive-shot group relative overflow-hidden rounded-xl border border-white/[0.1] bg-[#101923] shadow-[0_14px_30px_rgba(0,0,0,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c7e5ef]/46 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] ' + (selected ? 'ring-2 ring-[#c7e5ef]/58' : '')}
      onClick={onToggle}
    >
      <div
        className="cursor-zoom-in"
        onClick={(event) => {
          event.stopPropagation()
          onPreview()
        }}
      >
        <ScreenshotFrame
          filePath={shot.file_path}
          alt={shot.file_name}
          className="flex items-center justify-center bg-archive-850"
        />
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2 border-t border-white/[0.055] px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] text-archive-300" title={shot.file_name}>{gameName ?? SCREENSHOT_STATUS_LABELS[shot.status]}</p>
          <p className="mt-0.5 text-[10px] text-archive-600">{formatDate(shot.captured_at)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            onClick={(event) => {
              event.stopPropagation()
              window.api.file.openLocation(shot.file_path)
            }}
            className="pv-icon-button h-7 w-7"
            title="打开文件位置"
          >
            <FolderOpen size={13} />
          </button>
          {isTrash ? (
            <>
              <button onClick={(event) => { event.stopPropagation(); onRestore() }} className="pv-icon-button h-7 w-7 text-accent-teal" title="恢复到待整理"><Undo2 size={13} /></button>
              <button onClick={(event) => { event.stopPropagation(); onPermanentDelete() }} className="pv-icon-button h-7 w-7 text-accent-red" title="永久删除"><Trash2 size={13} /></button>
            </>
          ) : (
            <>
              <button onClick={(event) => { event.stopPropagation(); onClassify() }} className="pv-icon-button h-7 w-7 text-accent-teal" title={shot.status === 'classified' ? '重新归类' : '归类到游戏'}><CheckCircle size={13} /></button>
              {shot.status === 'classified' && <button onClick={(event) => { event.stopPropagation(); onClearClassification() }} className="pv-icon-button h-7 w-7" title="清除归属，移回待整理"><Undo2 size={13} /></button>}
              <button onClick={(event) => { event.stopPropagation(); onTrash() }} className="pv-icon-button h-7 w-7 hover:text-accent-red" title="移入回收站"><Trash2 size={13} /></button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
