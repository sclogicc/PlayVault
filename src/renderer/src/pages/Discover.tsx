import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Plus,
  EyeOff,
  Star,
  FolderOpen,
  HardDrive,
  Loader2,
} from 'lucide-react'
import type { DiscoveredExecutable } from '@shared/types'
import type { DiscoveredStatus } from '@shared/constants'
import { DISCOVERED_STATUSES, DISCOVERED_STATUS_LABELS } from '@shared/constants'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'

export default function Discover(): React.ReactElement {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<DiscoveredStatus | '全部'>('全部')
  const [acceptingId, setAcceptingId] = useState<number | null>(null)
  const [displayName, setDisplayName] = useState('')

  const { data: candidates = [], isLoading } = useQuery<DiscoveredExecutable[]>({
    queryKey: ['discovered', statusFilter],
    queryFn: () =>
      window.api.discovered.getAll(
        statusFilter !== '全部' ? statusFilter : undefined,
      ),
  })

  const acceptMutation = useMutation({
    mutationFn: (data: { candidateId: number; displayName?: string }) =>
      window.api.discover.accept(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discovered'] })
      qc.invalidateQueries({ queryKey: ['games'] })
      setAcceptingId(null)
      setDisplayName('')
    },
  })

  const ignoreMutation = useMutation({
    mutationFn: (id: number) =>
      window.api.discovered.updateStatus(id, 'ignored'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discovered'] })
    },
  })

  const handleAccept = (): void => {
    if (acceptingId !== null) {
      acceptMutation.mutate({
        candidateId: acceptingId,
        displayName: displayName.trim() || undefined,
      })
    }
  }

  const openAccept = (id: number, defaultName: string): void => {
    setAcceptingId(id)
    setDisplayName(defaultName)
  }

  const statusFilterOptions = [
    { value: '全部', label: '全部' },
    ...DISCOVERED_STATUSES.map((s) => ({
      value: s,
      label: DISCOVERED_STATUS_LABELS[s],
    })),
  ]

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '—'
    const mb = bytes / (1024 * 1024)
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
    if (mb >= 1) return `${mb.toFixed(0)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-archive-100">发现候选</h2>
          <p className="text-sm text-archive-500 mt-0.5">
            {candidates.length} 个候选可执行文件
          </p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {statusFilterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value as DiscoveredStatus | '全部')}
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

      {/* Candidate list */}
      {isLoading ? (
        <div className="card text-center py-12">
          <Loader2 size={24} className="animate-spin text-archive-500 mx-auto mb-3" />
          <p className="text-archive-500">加载中...</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="card text-center py-16">
          <Search size={48} className="text-archive-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-archive-400 mb-2">
            暂无候选
          </h3>
          <p className="text-archive-600 text-sm">
            前往「设置」配置游戏扫描目录，然后点击扫描
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-archive-700/50">
                <th className="table-header">文件</th>
                <th className="table-header">目录</th>
                <th className="table-header">路径</th>
                <th className="table-header w-[60px]">评分</th>
                <th className="table-header">识别原因</th>
                <th className="table-header w-[80px]">大小</th>
                <th className="table-header w-[90px]">状态</th>
                <th className="table-header w-[120px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-archive-800/50 transition-colors"
                >
                  {/* File name */}
                  <td className="table-cell">
                    <p className="text-archive-100 font-medium text-sm">
                      {c.file_name}
                    </p>
                  </td>

                  {/* Folder name */}
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5 text-archive-400 text-sm">
                      <FolderOpen size={12} />
                      {c.folder_name}
                    </div>
                  </td>

                  {/* Path */}
                  <td className="table-cell">
                    <p className="text-xs text-archive-500 truncate max-w-[200px] font-mono">
                      {c.file_path}
                    </p>
                  </td>

                  {/* Score */}
                  <td className="table-cell">
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-mono font-medium ${
                        c.score >= 70
                          ? 'text-accent-teal'
                          : c.score >= 40
                            ? 'text-accent-gold'
                            : 'text-archive-500'
                      }`}
                    >
                      <Star size={10} />
                      {c.score}
                    </span>
                  </td>

                  {/* Match reasons */}
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-1">
                      {JSON.parse(c.match_reasons).map(
                        (reason: string, i: number) => (
                          <span
                            key={i}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              reason.startsWith('⚠')
                                ? 'bg-accent-red/10 text-accent-red'
                                : reason.startsWith('✓')
                                  ? 'bg-accent-teal/10 text-accent-teal'
                                  : 'bg-archive-700/50 text-archive-400'
                            }`}
                          >
                            {reason}
                          </span>
                        ),
                      )}
                    </div>
                  </td>

                  {/* File size */}
                  <td className="table-cell">
                    <div className="flex items-center gap-1 text-xs text-archive-400">
                      <HardDrive size={10} />
                      {formatFileSize(c.file_size)}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="table-cell">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.status === 'accepted'
                          ? 'bg-accent-teal/15 text-accent-teal'
                          : c.status === 'ignored'
                            ? 'bg-archive-600/30 text-archive-500'
                            : c.status === 'rejected'
                              ? 'bg-accent-red/10 text-accent-red'
                              : 'bg-accent-gold/10 text-accent-gold'
                      }`}
                    >
                      {DISCOVERED_STATUS_LABELS[c.status]}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      {c.status === 'pending' && (
                        <>
                          <button
                            onClick={() =>
                              openAccept(c.id, c.folder_name || c.file_name.replace(/\.exe$/i, ''))
                            }
                            className="p-1.5 text-accent-teal hover:bg-accent-teal/10 rounded transition-colors"
                            title="加入游戏库"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => ignoreMutation.mutate(c.id)}
                            className="p-1.5 text-archive-500 hover:text-archive-300 rounded transition-colors"
                            title="忽略"
                          >
                            <EyeOff size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Accept Confirmation Modal */}
      <Modal
        open={acceptingId !== null}
        onClose={() => {
          setAcceptingId(null)
          setDisplayName('')
        }}
        title="加入游戏库"
      >
        <div className="space-y-4">
          <p className="text-sm text-archive-400">
            将以此信息创建游戏，加入后可在游戏库中继续编辑详情。
          </p>
          <Input
            label="游戏名称"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="输入游戏名称"
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-archive-700/30">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setAcceptingId(null)
                setDisplayName('')
              }}
            >
              取消
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending && (
                <Loader2 size={14} className="animate-spin" />
              )}
              加入游戏库
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
