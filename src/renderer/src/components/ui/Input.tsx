import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
}

export default function Input({
  label,
  hint,
  className = '',
  id,
  ...props
}: InputProps): React.ReactElement {
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor={id}
            className="block text-sm font-medium text-archive-200"
          >
            {label}
          </label>
          {hint && <span className="text-xs text-archive-500">{hint}</span>}
        </div>
      )}
      <input id={id} className={`input-field w-full ${className}`} {...props} />
    </div>
  )
}
