import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  children: ReactNode
}

const variants = {
  primary:
    'border-accent-violet/30 bg-gradient-to-r from-violet-500 to-accent-violet text-white shadow-[0_10px_24px_rgba(109,40,217,0.28)] hover:-translate-y-px hover:from-violet-400 hover:to-violet-500 hover:shadow-[0_14px_30px_rgba(109,40,217,0.38)]',
  secondary:
    'border-white/[0.09] bg-white/[0.06] text-archive-200 hover:-translate-y-px hover:border-white/[0.16] hover:bg-white/[0.1] hover:text-archive-50',
  danger:
    'border-accent-red/25 bg-accent-red/10 text-accent-red hover:-translate-y-px hover:bg-accent-red/20',
  ghost:
    'border-transparent bg-transparent text-archive-400 hover:bg-white/[0.06] hover:text-archive-100',
}

const sizes = {
  sm: 'min-h-8 px-3 py-1.5 text-xs',
  md: 'min-h-10 px-4 py-2 text-sm',
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps): React.ReactElement {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-archive border font-medium
        transition-all duration-200 active:translate-y-0
        ${variants[variant]} ${sizes[size]}
        ${disabled ? 'cursor-not-allowed opacity-45 shadow-none hover:translate-y-0' : 'cursor-pointer'}
        ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
