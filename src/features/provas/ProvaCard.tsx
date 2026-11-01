import { Link } from 'react-router'
import { Users } from 'lucide-react'
import { Selo } from '@/components/ui/feedback'
import { CopiarCodigo } from './CopiarCodigo'
import type { AvaliacaoComContagem } from '@/services/avaliacoes'

export function SeloStatus({ status }: { status: AvaliacaoComContagem['status'] }) {
  return status === 'ativa' ? <Selo tom="ativa">Recebendo entregas</Selo> : <Selo tom="encerrada">Encerrada</Selo>
}

export function ProvaCard({ prova }: { prova: AvaliacaoComContagem }) {
  return (
    <article className="relative flex flex-col rounded-md border border-linha bg-folha p-5 transition-colors hover:border-tinta">
      <div className="flex items-start justify-between gap-3">
        <CopiarCodigo codigo={prova.codigo} />
        <SeloStatus status={prova.status} />
      </div>

      <h3 className="mt-4 text-lg font-bold leading-snug">
        <Link
          to={`/professor/provas/${prova.id}`}
          className="after:absolute after:inset-0 hover:underline"
        >
          {prova.tipoProva}
        </Link>
      </h3>
      <p className="mt-0.5 text-sm text-tinta/70">{prova.turma}</p>

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Disciplinas">
        {Object.keys(prova.estrutura).map((disciplina) => (
          <li key={disciplina} className="rounded-sm bg-papel px-2 py-0.5 text-xs font-medium text-tinta/80">
            {disciplina}
          </li>
        ))}
      </ul>

      <p className="mt-4 flex items-center gap-1.5 border-t border-linha pt-3 text-sm text-tinta/70">
        <Users aria-hidden className="size-4" />
        {prova.totalEntregas} {prova.totalEntregas === 1 ? 'entrega' : 'entregas'}
      </p>
    </article>
  )
}
