import { useEffect, useState } from 'react'
import type { CoverCrop } from '@shared/coverCrop'
import {
  COVER_CROP_EDITOR_LIMITS,
  DEFAULT_COVER_CROP,
  getCoverCropResetKey,
  getCoverImageStyle,
  normalizeCoverCrop,
} from '@shared/coverCrop'
import { RotateCcw } from 'lucide-react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { toFileUrl } from '../../lib/fileUrl'

interface CoverCropEditorProps {
  open: boolean
  filePath: string
  initialCrop: CoverCrop
  aspectRatio: string
  title: string
  onClose: () => void
  onSave: (crop: CoverCrop) => void
}

export default function CoverCropEditor({
  open,
  filePath,
  initialCrop,
  aspectRatio,
  title,
  onClose,
  onSave,
}: CoverCropEditorProps): React.ReactElement {
  const [crop, setCrop] = useState<CoverCrop>(initialCrop)
  const resetKey = getCoverCropResetKey(filePath, aspectRatio, initialCrop)

  useEffect(() => {
    if (open) setCrop(normalizeCoverCrop(initialCrop))
  }, [open, resetKey])

  const updateCrop = (key: keyof CoverCrop, value: number): void => {
    setCrop((previous) => normalizeCoverCrop({ ...previous, [key]: value }))
  }

  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-3xl">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-xl text-sm leading-6 text-archive-400">拖动下方控制项来调整构图。预览框就是最终显示边界，图片即使缩放也不会越过该边界，原始文件不会被修改。</p>
          <button type="button" onClick={() => setCrop({ ...DEFAULT_COVER_CROP })} className="inline-flex items-center gap-1.5 text-xs text-archive-400 transition-colors hover:text-[#ead7aa]">
            <RotateCcw size={13} /> 恢复默认构图
          </button>
        </div>

        <div className="media-frame mx-auto w-full max-w-[720px] border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.4)]" style={{ aspectRatio }}>
          <img src={toFileUrl(filePath)} alt="封面裁切预览" className="media-image transition-transform duration-100" style={getCoverImageStyle(crop)} />
          <div className="pointer-events-none absolute inset-0 border border-white/[0.25]" />
          <div className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/[0.16]" />
          <div className="pointer-events-none absolute inset-y-0 right-1/3 w-px bg-white/[0.16]" />
          <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/[0.16]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-1/3 h-px bg-white/[0.16]" />
          <span className="absolute left-3 top-3 border border-white/[0.16] bg-black/55 px-2 py-1 text-[10px] tracking-[0.12em] text-archive-200">最终显示区域</span>
        </div>

        <div className="border-t border-white/[0.07] pt-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <CropRange label="缩放" value={crop.zoom} min={COVER_CROP_EDITOR_LIMITS.zoom.min} max={COVER_CROP_EDITOR_LIMITS.zoom.max} step={COVER_CROP_EDITOR_LIMITS.zoom.step} display={`${crop.zoom.toFixed(2)} 倍`} onChange={(value) => updateCrop('zoom', value)} />
            <CropRange label="水平位置" value={crop.x} min={COVER_CROP_EDITOR_LIMITS.offset.min} max={COVER_CROP_EDITOR_LIMITS.offset.max} step={COVER_CROP_EDITOR_LIMITS.offset.step} display={crop.x === 0 ? '居中' : `${crop.x > 0 ? '向右' : '向左'} ${Math.abs(crop.x)}`} onChange={(value) => updateCrop('x', value)} />
            <CropRange label="垂直位置" value={crop.y} min={COVER_CROP_EDITOR_LIMITS.offset.min} max={COVER_CROP_EDITOR_LIMITS.offset.max} step={COVER_CROP_EDITOR_LIMITS.offset.step} display={crop.y === 0 ? '居中' : `${crop.y > 0 ? '向下' : '向上'} ${Math.abs(crop.y)}`} onChange={(value) => updateCrop('y', value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/[0.07] pt-4">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={() => onSave(normalizeCoverCrop(crop))}>保存构图</Button>
        </div>
      </div>
    </Modal>
  )
}

function CropRange({
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
      <input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[#c9a35a]" />
    </label>
  )
}
