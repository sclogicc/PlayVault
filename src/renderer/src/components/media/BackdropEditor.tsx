/* 视觉基线：背景构图编辑器沿用详情舞台的冷墨玻璃控制层。 */
import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import type { BackdropCrop } from '@shared/backdropCrop'
import {
  BACKDROP_CROP_LIMITS,
  DEFAULT_BACKDROP_CROP,
  getBackdropCropResetKey,
  normalizeBackdropCrop,
} from '@shared/backdropCrop'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import BackdropStage from './BackdropStage'

interface BackdropEditorProps {
  open: boolean
  filePath: string
  initialCrop: BackdropCrop
  onClose: () => void
  onSave: (crop: BackdropCrop) => void
}

/**
 * 背景编辑器不自行模拟图片渲染，而是直接使用 BackdropStage。
 * 因而缩放、横向焦点和纵向焦点在编辑器与详情页中的表现保持一致。
 */
export default function BackdropEditor({
  open,
  filePath,
  initialCrop,
  onClose,
  onSave,
}: BackdropEditorProps): React.ReactElement {
  const [crop, setCrop] = useState<BackdropCrop>(initialCrop)
  const resetKey = getBackdropCropResetKey(filePath, initialCrop)

  useEffect(() => {
    if (open) setCrop(normalizeBackdropCrop(initialCrop))
  }, [open, resetKey])

  const updateCrop = (key: keyof BackdropCrop, value: number): void => {
    setCrop((previous) => normalizeBackdropCrop({ ...previous, [key]: value }))
  }

  return (
    <Modal open={open} onClose={onClose} title="调整详情背景" width="max-w-3xl">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-xl text-sm leading-6 text-archive-400">此处预览与详情页使用同一背景舞台。缩放会生成安全的可移动余量，横向和纵向焦点会即时移动图片，且不会露出空白边缘。</p>
          <button type="button" onClick={() => setCrop({ ...DEFAULT_BACKDROP_CROP })} className="inline-flex items-center gap-1.5 text-xs text-archive-400 transition-colors hover:text-[#dceff6]">
            <RotateCcw size={13} /> 恢复默认构图
          </button>
        </div>

        <BackdropStage
          filePath={filePath}
          crop={crop}
          alt="详情背景构图预览"
          className="mx-auto h-[210px] w-full max-w-[720px] border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.4)] sm:h-[250px]"
        >
          <div className="pointer-events-none absolute inset-0 border border-white/[0.25]" />
          <div className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/[0.16]" />
          <div className="pointer-events-none absolute inset-y-0 right-1/3 w-px bg-white/[0.16]" />
          <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/[0.16]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-1/3 h-px bg-white/[0.16]" />
          <span className="pointer-events-none absolute left-3 top-3 border border-white/[0.16] bg-black/55 px-2 py-1 text-[10px] tracking-[0.12em] text-archive-200">最终显示区域</span>
        </BackdropStage>

        <div className="grid gap-4 border-t border-white/[0.07] pt-5 sm:grid-cols-3">
          <BackdropRange label="缩放" value={crop.zoom} min={BACKDROP_CROP_LIMITS.zoom.min} max={BACKDROP_CROP_LIMITS.zoom.max} step={BACKDROP_CROP_LIMITS.zoom.step} display={`${crop.zoom.toFixed(2)} 倍`} onChange={(value) => updateCrop('zoom', value)} />
          <BackdropRange label="横向焦点" value={crop.focalX} min={BACKDROP_CROP_LIMITS.focal.min} max={BACKDROP_CROP_LIMITS.focal.max} step={BACKDROP_CROP_LIMITS.focal.step} display={getFocalLabel(crop.focalX, '左', '右')} onChange={(value) => updateCrop('focalX', value)} />
          <BackdropRange label="纵向焦点" value={crop.focalY} min={BACKDROP_CROP_LIMITS.focal.min} max={BACKDROP_CROP_LIMITS.focal.max} step={BACKDROP_CROP_LIMITS.focal.step} display={getFocalLabel(crop.focalY, '上', '下')} onChange={(value) => updateCrop('focalY', value)} />
        </div>

        <div className="flex justify-end gap-2 border-t border-white/[0.07] pt-4">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={() => onSave(normalizeBackdropCrop(crop))}>保存构图</Button>
        </div>
      </div>
    </Modal>
  )
}

function getFocalLabel(value: number, negative: string, positive: string): string {
  if (Math.abs(value) < 0.01) return '居中'
  return `${value > 0 ? positive : negative} ${Math.round(Math.abs(value) * 100)}%`
}

function BackdropRange({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (value: number) => void
}): React.ReactElement {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-archive-300">{label}</span>
        <span className="font-mono text-archive-500">{display}</span>
      </div>
      <input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[#b9dce8]" />
    </label>
  )
}
