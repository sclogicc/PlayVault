import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  children: ReactNode
}

const variants = {
  primary:
    'bg-accent-teal/20 text-accent-teal border-accent-teal/30 hover:bg-accent-teal/30',
  secondary:
    'bg-archive-700 text-archive-200 border-archive-600/50 hover:bg-archive-600',
  danger:
    'bg-accent-red/20 text-accent-red border-accent-red/30 hover:bg-accent-red/30',
  ghost:
    'bg-transparent text-archive-400 border-transparent hover:text-archive-200 hover:bg-archive-800',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps): React.ReactElement {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-archive border
        transition-colors duration-150 font-medium
        ${variants[variant]} ${sizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
