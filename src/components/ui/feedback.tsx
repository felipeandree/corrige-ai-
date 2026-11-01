import type { ReactNode } from 'react'
import { Loader2, TriangleAlert } from 'lucide-react'
import clsx from 'clsx'

export function Carregando({ texto = 'Carregando…', className }: { texto?: string; className?: string }) {
  return (
    <div role="status" className={clsx('flex items-center justify-center gap-2 py-16 text-sm text-tinta/70', className)}>
      <Loader2 aria-hidden className="size-4 animate-spin" />
      {texto}
    </div>
  )
}

export function ErroCarregamento({ mensagem, aoTentarDeNovo }: { mensagem: string; aoTentarDeNovo?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-md border border-caneta/30 bg-folha px-6 py-12 text-center">
      <TriangleAlert aria-hidden className="size-6 text-caneta" />
      <p className="max-w-sm text-sm">{mensagem}</p>
      {aoTentarDeNovo && (
        <button type="button" onClick={aoTentarDeNovo} className="text-sm font-semibold underline underline-offset-4">
          Tentar de novo
        </button>
      )}
    </div>
  )
}

export function EstadoVazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-linha bg-folha px-6 py-14 text-center">
      <h3 className="text-base font-bold">{titulo}</h3>
      {children && <div className="mx-auto mt-2 max-w-sm text-sm text-tinta/70">{children}</div>}
    </div>
  )
}

export function Selo({ tom, children }: { tom: 'ativa' | 'encerrada' | 'neutro'; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-semibold',
        tom === 'ativa' && 'border-acerto/40 bg-acerto/10 text-acerto',
        tom === 'encerrada' && 'border-linha bg-papel text-tinta/70',
        tom === 'neutro' && 'border-linha bg-folha text-tinta/80',
      )}
    >
      {tom === 'ativa' && <span aria-hidden className="size-1.5 rounded-full bg-acerto" />}
      {children}
    </span>
  )
}
