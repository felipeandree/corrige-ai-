import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import clsx from 'clsx'

type TipoToast = 'sucesso' | 'erro' | 'info'

interface Toast {
  id: number
  tipo: TipoToast
  mensagem: string
}

interface ToastContextValue {
  mostrar: (mensagem: string, tipo?: TipoToast) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONES = { sucesso: CheckCircle2, erro: TriangleAlert, info: Info } as const
const DURACAO_MS = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const proximoId = useRef(0)

  const remover = useCallback((id: number) => setToasts((atuais) => atuais.filter((t) => t.id !== id)), [])

  const mostrar = useCallback(
    (mensagem: string, tipo: TipoToast = 'info') => {
      const id = proximoId.current++
      setToasts((atuais) => [...atuais.slice(-3), { id, tipo, mensagem }])
      window.setTimeout(() => remover(id), DURACAO_MS)
    },
    [remover],
  )

  const value = useMemo(() => ({ mostrar }), [mostrar])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6"
      >
        {toasts.map((toast) => {
          const Icone = ICONES[toast.tipo]
          return (
            <div
              key={toast.id}
              role={toast.tipo === 'erro' ? 'alert' : 'status'}
              className={clsx(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border bg-white px-4 py-3 text-sm shadow-lg',
                toast.tipo === 'sucesso' && 'border-acerto/40',
                toast.tipo === 'erro' && 'border-caneta/40',
                toast.tipo === 'info' && 'border-linha',
              )}
            >
              <Icone
                aria-hidden
                className={clsx(
                  'mt-0.5 size-4 shrink-0',
                  toast.tipo === 'sucesso' && 'text-acerto',
                  toast.tipo === 'erro' && 'text-caneta',
                  toast.tipo === 'info' && 'text-tinta/70',
                )}
              />
              <p className="flex-1 text-tinta">{toast.mensagem}</p>
              <button
                type="button"
                onClick={() => remover(toast.id)}
                aria-label="Fechar aviso"
                className="-m-1 rounded p-1 text-tinta/70 hover:text-tinta"
              >
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return ctx
}
