import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function Input({
  label,
  className = '',
  id,
  ...props
}: InputProps): React.ReactElement {
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm text-archive-300 font-medium"
        >
          {label}
        </label>
      )}
      <input id={id} className={`input-field w-full ${className}`} {...props} />
    </div>
  )
}
