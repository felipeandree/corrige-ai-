import { useState } from 'react'
import { useAvaliacoes } from '@/hooks/useAvaliacoes'
import { traduzirErro } from '@/lib/errors'
import { ButtonLink } from '@/components/ui/Button'
import { Carregando, ErroCarregamento, EstadoVazio } from '@/components/ui/feedback'
import { ProvaCard } from '@/features/provas/ProvaCard'
import type { StatusAvaliacao } from '@/types/domain'
import clsx from 'clsx'

type Filtro = 'todas' | StatusAvaliacao

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'ativa', rotulo: 'Recebendo entregas' },
  { valor: 'encerrada', rotulo: 'Encerradas' },
]

export default function Provas() {
  const { data, isPending, isError, error, refetch } = useAvaliacoes()
  const [filtro, setFiltro] = useState<Filtro>('todas')

  const visiveis = data?.filter((p) => filtro === 'todas' || p.status === filtro) ?? []

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold">Provas</h1>
        <ButtonLink to="/professor/provas/nova">Criar prova</ButtonLink>
      </div>

      <div role="group" aria-label="Filtrar por situação" className="mt-6 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            aria-pressed={filtro === f.valor}
            onClick={() => setFiltro(f.valor)}
            className={clsx(
              'rounded-md border px-3.5 py-1.5 text-sm font-medium',
              filtro === f.valor ? 'border-tinta bg-tinta text-white' : 'border-linha bg-folha hover:border-tinta',
            )}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {isPending && <Carregando />}
        {isError && <ErroCarregamento mensagem={traduzirErro(error)} aoTentarDeNovo={() => void refetch()} />}
        {data && visiveis.length === 0 && (
          <EstadoVazio titulo={filtro === 'todas' ? 'Nenhuma prova por aqui' : 'Nenhuma prova nesta situação'}>
            {filtro === 'todas' ? 'Crie a primeira prova para gerar um código de acesso.' : 'Troque o filtro para ver as outras.'}
          </EstadoVazio>
        )}
        {visiveis.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visiveis.map((prova) => (
              <ProvaCard key={prova.id} prova={prova} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
