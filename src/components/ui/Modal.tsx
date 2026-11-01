import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface ModalProps {
  aberto: boolean
  aoFechar: () => void
  titulo: string
  descricao?: string
  largura?: 'sm' | 'md' | 'lg'
  rodape?: ReactNode
  children: ReactNode
}

const LARGURAS = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-4xl' } as const

/** Usa o <dialog> nativo: foco preso, Esc para fechar e leitor de tela corretos sem biblioteca. */
export function Modal({ aberto, aoFechar, titulo, descricao, largura = 'md', rodape, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (aberto && !dialog.open) dialog.showModal()
    if (!aberto && dialog.open) dialog.close()
  }, [aberto])

  if (!aberto) return <dialog ref={ref} />

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        aoFechar()
      }}
      onClick={(e) => {
        if (e.target === ref.current) aoFechar()
      }}
      aria-labelledby="modal-titulo"
      className={clsx(
        'm-auto w-[calc(100%-2rem)] overflow-hidden rounded-md border border-linha bg-folha p-0 text-tinta shadow-xl',
        LARGURAS[largura],
      )}
    >
      <div className="flex max-h-[85vh] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-linha px-6 py-4">
          <div>
            <h2 id="modal-titulo" className="text-lg font-bold">
              {titulo}
            </h2>
            {descricao && <p className="mt-1 text-sm text-tinta/70">{descricao}</p>}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="-m-1.5 rounded p-1.5 text-tinta/70 hover:bg-tinta/5 hover:text-tinta"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {rodape && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-linha bg-papel px-6 py-4">{rodape}</footer>}
      </div>
    </dialog>
  )
}
