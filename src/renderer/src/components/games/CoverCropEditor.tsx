import { useEffect, useState } from 'react'
import type { CoverCrop } from '@shared/coverCrop'
import { getCoverCropResetKey, getCoverImageStyle } from '@shared/coverCrop'
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
    if (open) setCrop(initialCrop)
  }, [open, resetKey])

  const updateCrop = (key: keyof CoverCrop, value: number): void => {
    setCrop((previous) => ({ ...previous, [key]: value }))
  }

  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-3xl">
      <div className="space-y-5">
        <p className="text-sm text-archive-400">
          调整缩放和位置，决定封面区域显示哪一部分。不会修改原始图片文件。
        </p>

        <div
          className="mx-auto overflow-hidden rounded bg-archive-950"
          style={{ aspectRatio, maxHeight: '420px' }}
        >
          <img
            src={toFileUrl(filePath)}
            alt="封面裁切预览"
            className="h-full w-full object-cover transition-transform duration-100"
            style={getCoverImageStyle(crop)}
          />
        </div>

        <div className="space-y-4">
          <CropRange
            label="缩放"
            value={crop.zoom}
            min={1}
            max={3}
            step={0.05}
            display={`${crop.zoom.toFixed(2)} 倍`}
            onChange={(value) => updateCrop('zoom', value)}
          />
          <CropRange
            label="水平位置"
            value={crop.x}
            min={-100}
            max={100}
            step={1}
            display={crop.x === 0 ? '居中' : `${crop.x > 0 ? '向右' : '向左'} ${Math.abs(crop.x)}`}
            onChange={(value) => updateCrop('x', value)}
          />
          <CropRange
            label="垂直位置"
            value={crop.y}
            min={-100}
            max={100}
            step={1}
            display={crop.y === 0 ? '居中' : `${crop.y > 0 ? '向下' : '向上'} ${Math.abs(crop.y)}`}
            onChange={(value) => updateCrop('y', value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={() => onSave(crop)}>保存封面</Button>
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
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-archive-300">{label}</span>
        <span className="text-archive-500">{display}</span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-teal-400"
      />
    </label>
  )
}
