import { Link } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { useAvaliacoes } from '@/hooks/useAvaliacoes'
import { traduzirErro } from '@/lib/errors'
import { formatarDataHora } from '@/lib/format'
import { ButtonLink } from '@/components/ui/Button'
import { Carregando, ErroCarregamento, EstadoVazio } from '@/components/ui/feedback'
import { SeloStatus } from '@/features/provas/ProvaCard'

function Indicador({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="rounded-md border border-linha bg-folha p-5">
      <p className="font-display text-4xl font-extrabold tabular-nums">{valor}</p>
      <p className="mt-1 text-sm text-tinta/70">{rotulo}</p>
    </div>
  )
}

export default function Painel() {
  const { nomeExibicao } = useAuth()
  const { data, isPending, isError, error, refetch } = useAvaliacoes()

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Olá, {nomeExibicao.split(' ')[0] || 'professor(a)'}</h1>
          <p className="mt-1 text-tinta/70">Crie uma prova, passe o código e acompanhe as entregas.</p>
        </div>
        <ButtonLink to="/professor/provas/nova">Criar prova</ButtonLink>
      </div>

      {isPending && <Carregando />}
      {isError && <ErroCarregamento mensagem={traduzirErro(error)} aoTentarDeNovo={() => void refetch()} />}

      {data && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Indicador valor={data.length} rotulo="Provas criadas" />
            <Indicador valor={data.filter((p) => p.status === 'ativa').length} rotulo="Recebendo entregas agora" />
            <Indicador valor={data.reduce((soma, p) => soma + p.totalEntregas, 0)} rotulo="Cartões recebidos" />
          </div>

          <section className="mt-10" aria-labelledby="recentes">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="recentes" className="text-xl font-bold">
                Provas recentes
              </h2>
              {data.length > 0 && (
                <Link to="/professor/provas" className="text-sm font-semibold underline underline-offset-4">
                  Ver todas
                </Link>
              )}
            </div>

            {data.length === 0 ? (
              <EstadoVazio titulo="Você ainda não criou nenhuma prova">
                Monte o gabarito em três passos e receba o código para a turma.
              </EstadoVazio>
            ) : (
              <ul className="divide-y divide-linha rounded-md border border-linha bg-folha">
                {data.slice(0, 5).map((prova) => (
                  <li key={prova.id}>
                    <Link
                      to={`/professor/provas/${prova.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-papel"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-display text-lg font-extrabold tracking-[0.15em]">{prova.codigo}</span>
                        <div>
                          <p className="font-semibold">{prova.tipoProva}</p>
                          <p className="text-sm text-tinta/70">
                            {prova.turma} · {formatarDataHora(prova.criadaEm)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-tinta/70">
                        <span>{prova.totalEntregas} entregas</span>
                        <SeloStatus status={prova.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
