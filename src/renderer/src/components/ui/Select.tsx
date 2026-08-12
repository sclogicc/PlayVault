import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export default function Select({
  label,
  options,
  className = '',
  id,
  ...props
}: SelectProps): React.ReactElement {
  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-archive-200"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        className={`input-field w-full cursor-pointer appearance-none bg-[linear-gradient(45deg,transparent_50%,#8593a5_50%),linear-gradient(135deg,#8593a5_50%,transparent_50%)] bg-[position:calc(100%-16px)_calc(50%-2px),calc(100%-11px)_calc(50%-2px)] bg-[size:5px_5px,5px_5px] bg-no-repeat pr-9 ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
