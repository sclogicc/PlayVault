import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle, FolderOpen, Image, Loader2, Trash2, Undo2 } from 'lucide-react'
import type { GameWithStats, Screenshot } from '@shared/types'
import { SCREENSHOT_STATUS_LABELS } from '@shared/constants'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Modal from '../components/ui/Modal'
import { toFileUrl } from '../lib/fileUrl'

type TabKey = 'all' | 'pending' | 'classified' | 'trashed'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'classified', label: 'Classified' },
  { key: 'trashed', label: 'Trash' },
]

export default function Screenshots(): React.ReactElement {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [classifyIds, setClassifyIds] = useState<number[]>([])
  const [targetGameId, setTargetGameId] = useState<string>('')
  const [permanentDeletingId, setPermanentDeletingId] = useState<number | null>(null)

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
  const restoreMutation = useMutation({
    mutationFn: (id: number) => window.api.screenshot.restore(id),
    onSuccess: invalidate,
  })
  const permanentDeleteMutation = useMutation({
    mutationFn: (id: number) => window.api.screenshot.permanentDelete(id),
    onSuccess: () => {
      invalidate()
      setPermanentDeletingId(null)
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
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-archive-100">Screenshot inbox</h2>
          <p className="text-sm text-archive-500 mt-0.5">
            {screenshots.length} screenshots
          </p>
        </div>
        {selectedIds.size > 0 && !isTrash && (
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => openClassification(Array.from(selectedIds))}>
              <CheckCircle size={14} />
              Classify to game
            </Button>
            <Button variant="secondary" size="sm" onClick={() => batchTrashMutation.mutate(Array.from(selectedIds))}>
              <Trash2 size={14} />
              Move to trash
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key)
              setSelectedIds(new Set())
            }}
            className={
              'px-3 py-1.5 text-xs rounded-archive border transition-colors ' +
              (activeTab === tab.key
                ? 'bg-accent-teal/20 text-accent-teal border-accent-teal/30'
                : 'bg-archive-800 text-archive-400 border-archive-700/50 hover:text-archive-200')
            }
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
          {!isTrash && (
            <label className="inline-flex items-center gap-2 text-sm text-archive-400 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size > 0 && selectedIds.size === screenshots.length}
                onChange={toggleSelectAll}
                className="rounded"
              />
              {selectedIds.size > 0 ? 'Selected ' + selectedIds.size : 'Select all'}
            </label>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {screenshots.map((shot) => (
              <ScreenshotCard
                key={shot.id}
                shot={shot}
                selected={selectedIds.has(shot.id)}
                isTrash={isTrash}
                gameName={games.find((game) => game.id === shot.game_id)?.display_name}
                onToggle={() => !isTrash && toggleSelect(shot.id)}
                onClassify={() => openClassification([shot.id])}
                onTrash={() => trashMutation.mutate(shot.id)}
                onRestore={() => restoreMutation.mutate(shot.id)}
                onPermanentDelete={() => setPermanentDeletingId(shot.id)}
                formatDate={formatDate}
              />
            ))}
          </div>
        </>
      )}

      <Modal
        open={classifyIds.length > 0}
        onClose={() => setClassifyIds([])}
        title="Classify screenshots"
      >
        <div className="space-y-4">
          <p className="text-sm text-archive-400">
            Classify {classifyIds.length} screenshot(s) to a game. Classified screenshots appear in that game''s archive page.
          </p>
          <select
            value={targetGameId}
            onChange={(event) => setTargetGameId(event.target.value)}
            className="input-field w-full"
          >
            <option value="">Choose a game</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.display_name}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setClassifyIds([])}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!targetGameId || classifyMutation.isPending}
              onClick={submitClassification}
            >
              {classifyMutation.isPending ? 'Classifying...' : 'Classify'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={permanentDeletingId !== null}
        onClose={() => setPermanentDeletingId(null)}
        onConfirm={() => permanentDeletingId !== null && permanentDeleteMutation.mutate(permanentDeletingId)}
        title="Permanently delete screenshot"
        message="This removes the screenshot record from PlayVault permanently, but does not delete the original file from disk."
        confirmLabel="Delete permanently"
        variant="danger"
      />
    </div>
  )
}

function LoadingState(): React.ReactElement {
  return (
    <div className="card text-center py-12">
      <Loader2 size={24} className="animate-spin text-archive-500 mx-auto mb-3" />
      <p className="text-archive-500">Loading...</p>
    </div>
  )
}

function EmptyState({ isTrash }: { isTrash: boolean }): React.ReactElement {
  return (
    <div className="card text-center py-16">
      <Image size={48} className="text-archive-700 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-archive-400 mb-2">
        {isTrash ? 'Trash is empty' : 'No screenshots'}
      </h3>
      <p className="text-archive-600 text-sm">
        {isTrash ? 'Screenshots moved to trash appear here.' : 'Configure a screenshot folder and new files will appear here.'}
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
  onTrash,
  onRestore,
  onPermanentDelete,
  formatDate,
}: {
  shot: Screenshot
  selected: boolean
  isTrash: boolean
  gameName?: string
  onToggle: () => void
  onClassify: () => void
  onTrash: () => void
  onRestore: () => void
  onPermanentDelete: () => void
  formatDate: (date: string) => string
}): React.ReactElement {
  const [imageError, setImageError] = useState(false)

  return (
    <div
      className={'card !p-0 overflow-hidden group relative ' + (selected ? 'ring-2 ring-accent-teal' : '')}
      onClick={onToggle}
    >
      <div className="aspect-video bg-archive-850 flex items-center justify-center overflow-hidden">
        {imageError ? (
          <div className="flex flex-col items-center gap-1 text-archive-600">
            <AlertTriangle size={24} />
            <span className="text-[10px]">Preview unavailable</span>
          </div>
        ) : (
          <img
            src={toFileUrl(shot.file_path)}
            alt={shot.file_name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        )}
      </div>
      <div className="p-2.5 space-y-1.5">
        <p className="text-xs text-archive-300 truncate" title={shot.file_name}>{shot.file_name}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-archive-500">{formatDate(shot.captured_at)}</span>
          <span className="text-[10px] text-archive-400 truncate">{gameName ?? SCREENSHOT_STATUS_LABELS[shot.status]}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={(event) => {
              event.stopPropagation()
              window.api.file.openLocation(shot.file_path)
            }}
            className="p-1 text-archive-500 hover:text-archive-200 rounded"
            title="Open file location"
          >
            <FolderOpen size={13} />
          </button>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isTrash ? (
              <>
                <button onClick={(event) => { event.stopPropagation(); onRestore() }} className="p-1 text-accent-teal hover:bg-accent-teal/10 rounded" title="Restore to pending"><Undo2 size={13} /></button>
                <button onClick={(event) => { event.stopPropagation(); onPermanentDelete() }} className="p-1 text-accent-red hover:bg-accent-red/10 rounded" title="Delete permanently"><Trash2 size={13} /></button>
              </>
            ) : (
              <>
                {shot.status !== 'classified' && <button onClick={(event) => { event.stopPropagation(); onClassify() }} className="p-1 text-accent-teal hover:bg-accent-teal/10 rounded" title="Classify to game"><CheckCircle size={13} /></button>}
                <button onClick={(event) => { event.stopPropagation(); onTrash() }} className="p-1 text-archive-400 hover:text-accent-red hover:bg-accent-red/10 rounded" title="Move to trash"><Trash2 size={13} /></button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
