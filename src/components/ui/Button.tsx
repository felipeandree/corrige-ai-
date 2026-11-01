import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

type Variante = 'primario' | 'secundario' | 'perigo' | 'texto'

const ESTILOS: Record<Variante, string> = {
  primario: 'bg-tinta text-white hover:bg-tinta/90 border-tinta',
  secundario: 'bg-folha text-tinta border-linha hover:border-tinta',
  perigo: 'bg-caneta text-white border-caneta hover:bg-caneta/90',
  texto: 'bg-transparent text-tinta border-transparent hover:bg-tinta/5',
}

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  carregando?: boolean
}

export function Button({ variante = 'primario', carregando, disabled, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={clsx(BASE, ESTILOS[variante], className)}
    >
      {carregando && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

export function ButtonLink({ variante = 'primario', className, ...rest }: LinkProps & { variante?: Variante }) {
  return <Link {...rest} className={clsx(BASE, ESTILOS[variante], className)} />
}
