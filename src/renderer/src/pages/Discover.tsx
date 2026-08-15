/* 视觉基线：冷墨玻璃候选卡，信息按文件、位置、识别依据和动作分层，不使用旧表格与暖金色。 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EyeOff, FolderOpen, HardDrive, Loader2, Plus, Search, Star } from 'lucide-react'
import type { DiscoveredExecutable } from '@shared/types'
import type { DiscoveredStatus } from '@shared/constants'
import { DISCOVERED_STATUSES, DISCOVERED_STATUS_LABELS } from '@shared/constants'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'

function parseReasons(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '—'
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  if (mb >= 1) return `${mb.toFixed(0)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

export default function Discover(): React.ReactElement {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<DiscoveredStatus | '全部'>('全部')
  const [acceptingId, setAcceptingId] = useState<number | null>(null)
  const [displayName, setDisplayName] = useState('')
  const { data: candidates = [], isLoading } = useQuery<DiscoveredExecutable[]>({
    queryKey: ['discovered', statusFilter],
    queryFn: () => window.api.discovered.getAll(statusFilter !== '全部' ? statusFilter : undefined),
  })
  const acceptMutation = useMutation({
    mutationFn: (data: { candidateId: number; displayName?: string }) => window.api.discover.accept(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discovered'] })
      qc.invalidateQueries({ queryKey: ['games'] })
      setAcceptingId(null)
      setDisplayName('')
    },
  })
  const ignoreMutation = useMutation({
    mutationFn: (id: number) => window.api.discovered.updateStatus(id, 'ignored'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discovered'] }),
  })
  const statusFilterOptions = [
    { value: '全部', label: '全部' },
    ...DISCOVERED_STATUSES.filter((status) => status !== 'ignored').map((status) => ({ value: status, label: DISCOVERED_STATUS_LABELS[status] })),
  ]

  return (
    <div className="pv-page space-y-5">
      <header className="pv-page-header">
        <div>
          <p className="eyebrow">本地扫描</p>
          <h1 className="pv-page-title">发现候选</h1>
          <p className="pv-page-copy">已发现 {candidates.length} 个可能的本地游戏。确认后才会进入你的私人游戏库。</p>
        </div>
      </header>

      <section className="pv-toolbar flex flex-wrap items-center gap-1.5 p-2" aria-label="候选状态筛选">
        {statusFilterOptions.map((option) => (
          <button key={option.value} type="button" data-active={statusFilter === option.value} onClick={() => setStatusFilter(option.value as DiscoveredStatus | '全部')} className="pv-segment px-3 py-2 text-xs font-medium">
            {option.label}
          </button>
        ))}
      </section>

      {isLoading ? (
        <div className="empty-state"><Loader2 size={24} className="mx-auto mb-3 animate-spin text-[#b7d5e1]" /><p className="text-sm text-archive-500">正在读取本地扫描结果…</p></div>
      ) : candidates.length === 0 ? (
        <div className="empty-state"><Search size={38} className="mx-auto mb-4 text-[#aacbd8]/52" /><h2 className="text-lg font-medium text-[#dcebf1]">暂时没有候选</h2><p className="mt-2 text-sm text-archive-500">前往“设置”配置游戏扫描目录后，再执行扫描即可。</p></div>
      ) : (
        <section className="grid gap-3 xl:grid-cols-2" aria-label="候选可执行文件">
          {candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} onAccept={() => { setAcceptingId(candidate.id); setDisplayName(candidate.folder_name || candidate.file_name.replace(/\.exe$/i, '')) }} onIgnore={() => ignoreMutation.mutate(candidate.id)} />
          ))}
        </section>
      )}

      <Modal open={acceptingId !== null} onClose={() => { setAcceptingId(null); setDisplayName('') }} title="加入游戏库">
        <div className="space-y-4">
          <p className="text-sm leading-6 text-archive-400">将以此信息创建游戏；加入后可继续设置背景、封面和游玩记录。</p>
          <Input label="游戏名称" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="输入游戏名称" />
          <div className="flex justify-end gap-3 border-t border-white/[0.08] pt-4"><Button variant="secondary" size="sm" onClick={() => { setAcceptingId(null); setDisplayName('') }}>取消</Button><Button variant="primary" size="sm" onClick={() => acceptingId !== null && acceptMutation.mutate({ candidateId: acceptingId, displayName: displayName.trim() || undefined })} disabled={acceptMutation.isPending}>{acceptMutation.isPending && <Loader2 size={14} className="animate-spin" />}加入游戏库</Button></div>
        </div>
      </Modal>
    </div>
  )
}

function CandidateCard({ candidate, onAccept, onIgnore }: { candidate: DiscoveredExecutable; onAccept: () => void; onIgnore: () => void }): React.ReactElement {
  const reasons = parseReasons(candidate.match_reasons)
  const scoreTone = candidate.score >= 70 ? 'text-emerald-300' : candidate.score >= 40 ? 'text-[#d1e5ed]' : 'text-archive-500'
  return (
    <article className="pv-panel p-4 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-white/[0.2] hover:shadow-[0_18px_36px_rgba(0,0,0,0.2)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0"><p className="truncate text-[15px] font-medium text-[#edf7fb]">{candidate.file_name}</p><p className="mt-1 flex items-center gap-1.5 truncate text-xs text-archive-500"><FolderOpen size={12} />{candidate.folder_name}</p></div>
        <div className="shrink-0 text-right"><span className={`inline-flex items-center gap-1 text-xs font-medium ${scoreTone}`}><Star size={12} />{candidate.score}</span><p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-archive-600"><HardDrive size={11} />{formatFileSize(candidate.file_size)}</p></div>
      </div>
      <p className="mt-3 truncate rounded-md border border-white/[0.06] bg-black/[0.13] px-2.5 py-2 font-mono text-[11px] text-[#afc7d1]/58">{candidate.file_path}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">{reasons.length > 0 ? reasons.map((reason) => <span key={reason} className={`rounded-md border px-2 py-1 text-[10px] ${reason.startsWith('⚠') ? 'border-red-300/16 bg-red-300/[0.06] text-red-200' : reason.startsWith('✓') ? 'border-emerald-300/16 bg-emerald-300/[0.06] text-emerald-200' : 'border-white/[0.08] bg-white/[0.035] text-[#bcd3dc]/68'}`}>{reason}</span>) : <span className="text-[11px] text-archive-600">暂无额外识别依据</span>}</div>
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.075] pt-3"><span className="text-xs text-[#bcd2dc]/65">{DISCOVERED_STATUS_LABELS[candidate.status]}</span>{candidate.status === 'pending' && <div className="flex items-center gap-1"><button type="button" className="btn-primary min-h-8 px-3 py-1.5 text-xs" onClick={onAccept}><Plus size={13} />加入</button><button type="button" className="pv-icon-button h-8 w-8" title="忽略候选" aria-label="忽略候选" onClick={onIgnore}><EyeOff size={14} /></button></div>}</div>
    </article>
  )
}
