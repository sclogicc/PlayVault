import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { Game, GameFormData } from '@shared/types'
import type { GameStatus } from '@shared/constants'
import { GAME_STATUSES } from '@shared/constants'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'
import {
  useGameExecutables,
  useExecutableMutations,
} from '../../hooks/useGames'

interface GameFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: GameFormData) => void
  game?: GameWithStats | null
  isSaving?: boolean
}

interface GameWithStats extends Game {
  screenshot_count?: number
  total_duration?: number
}

export default function GameForm({
  open,
  onClose,
  onSave,
  game,
  isSaving,
}: GameFormProps): React.ReactElement {
  const isEdit = !!game
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [aliases, setAliases] = useState('')
  const [status, setStatus] = useState<GameStatus>('游玩中')
  const [platform, setPlatform] = useState('PC')
  const [tags, setTags] = useState('')
  const [screenshotFolderName, setScreenshotFolderName] = useState('')
  const [notes, setNotes] = useState('')
  const [newExeName, setNewExeName] = useState('')

  const { data: executables = [] } = useGameExecutables(
    isEdit ? game!.id : null,
  )
  const { addExe, removeExe } = useExecutableMutations()

  useEffect(() => {
    if (game) {
      setName(game.name)
      setDisplayName(game.display_name)
      setAliases(parseJsonArray(game.aliases).join(', '))
      setStatus(game.status as GameStatus)
      setPlatform(game.platform)
      setTags(parseJsonArray(game.tags).join(', '))
      setScreenshotFolderName(game.screenshot_folder_name)
      setNotes(game.notes)
    } else {
      setName('')
      setDisplayName('')
      setAliases('')
      setStatus('游玩中')
      setPlatform('PC')
      setTags('')
      setScreenshotFolderName('')
      setNotes('')
    }
    setNewExeName('')
  }, [game, open])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    onSave({
      name: name.trim(),
      display_name: displayName.trim() || name.trim(),
      aliases: JSON.stringify(
        aliases
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
      status,
      platform,
      tags: JSON.stringify(
        tags
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
      screenshot_folder_name:
        screenshotFolderName.trim() || displayName.trim() || name.trim(),
      notes,
      is_enabled: 1,
    })
  }

  const handleAddExe = (): void => {
    if (newExeName.trim() && game) {
      addExe.mutate({
        game_id: game.id,
        exe_name: newExeName.trim(),
      })
      setNewExeName('')
    }
  }

  const statusOptions = GAME_STATUSES.map((s) => ({ value: s, label: s }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? '编辑游戏' : '添加游戏'}
      width="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="系统名称 *"
            placeholder="例如: elden-ring"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="显示名称"
            placeholder="例如: Elden Ring"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="状态"
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value as GameStatus)}
          />
          <Input
            label="平台"
            placeholder="PC"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          />
        </div>

        <Input
          label="别名（逗号分隔）"
          placeholder="例如: 老头环, ER"
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
        />

        <Input
          label="标签（逗号分隔）"
          placeholder="例如: RPG, 开放世界, 魂系"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="截图归档文件夹名"
            placeholder="默认等于显示名称"
            value={screenshotFolderName}
            onChange={(e) => setScreenshotFolderName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm text-archive-300 font-medium">
            备注
          </label>
          <textarea
            className="input-field w-full min-h-[80px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="可选的备注信息..."
          />
        </div>

        {/* Executable binding (edit mode only) */}
        {isEdit && (
          <div className="space-y-2 pt-2 border-t border-archive-700/50">
            <label className="block text-sm text-archive-300 font-medium">
              可执行文件绑定
            </label>
            <div className="space-y-1.5">
              {executables.map((exe) => (
                <div
                  key={exe.id}
                  className="flex items-center justify-between bg-archive-900/50 rounded-archive px-3 py-2"
                >
                  <span className="text-sm text-archive-200 font-mono">
                    {exe.exe_name}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      removeExe.mutate({ id: exe.id, gameId: game!.id })
                    }
                    className="text-archive-500 hover:text-accent-red transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {executables.length === 0 && (
                <p className="text-xs text-archive-500">
                  尚未绑定任何可执行文件
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field flex-1 font-mono text-sm"
                placeholder="例如: eldenring.exe"
                value={newExeName}
                onChange={(e) => setNewExeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddExe()
                  }
                }}
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleAddExe}
                disabled={!newExeName.trim()}
              >
                <Plus size={14} />
                绑定
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-archive-700/50">
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? '保存中...' : isEdit ? '保存修改' : '添加游戏'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function parseJsonArray(json: string): string[] {
  try {
    const arr = JSON.parse(json)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}
