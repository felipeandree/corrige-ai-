import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/contexts/ToastContext'

interface CopiarCodigoProps {
  codigo: string
  tamanho?: 'md' | 'lg'
}

export function CopiarCodigo({ codigo, tamanho = 'md' }: CopiarCodigoProps) {
  const [copiado, setCopiado] = useState(false)
  const { mostrar } = useToast()

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 2000)
    } catch {
      mostrar(`Copie manualmente: ${codigo}`, 'info')
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={`Copiar código ${codigo}`}
      className="relative z-10 inline-flex items-center gap-2 rounded-md border border-tinta bg-papel px-2.5 py-1 hover:bg-marca"
    >
      <span
        className={`font-display font-extrabold tracking-[0.2em] ${tamanho === 'lg' ? 'text-3xl' : 'text-lg'}`}
      >
        {codigo}
      </span>
      {copiado ? <Check aria-hidden className="size-4 text-acerto" /> : <Copy aria-hidden className="size-4 text-tinta/70" />}
    </button>
  )
}
