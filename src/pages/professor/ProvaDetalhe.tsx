import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Download, Link2 } from 'lucide-react'
import clsx from 'clsx'
import { useToast } from '@/contexts/ToastContext'
import {
  useAvaliacao,
  useEncerrarAvaliacao,
  useEntregas,
  useExcluirAvaliacao,
  useExcluirEntrega,
  useGabarito,
} from '@/hooks/useAvaliacoes'
import { consolidarTurma, aprovado, type ResultadoAluno } from '@/lib/grading'
import { baixarCsv, relatorioParaCsv } from '@/lib/csv'
import { traduzirErro } from '@/lib/errors'
import { formatarDataHora, formatarPercentual, totalQuestoes } from '@/lib/format'
import { CartaoCorrigido } from '@/components/CartaoResposta'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Carregando, ErroCarregamento, EstadoVazio } from '@/components/ui/feedback'
import { CopiarCodigo } from '@/features/provas/CopiarCodigo'
import { SeloStatus } from '@/features/provas/ProvaCard'

const PALAVRA_EXCLUSAO = 'EXCLUIR'

const corDoPercentual = (valor: number) => (aprovado(valor) ? 'text-acerto' : 'text-caneta')

export default function ProvaDetalhe() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const { mostrar } = useToast()

  const prova = useAvaliacao(id)
  const gabarito = useGabarito(id)
  const aoReceberNova = useCallback((nome: string) => mostrar(`${nome} acabou de entregar.`, 'info'), [mostrar])
  const entregas = useEntregas(id, aoReceberNova)

  const encerrar = useEncerrarAvaliacao()
  const excluir = useExcluirAvaliacao()
  const excluirEntregaMutation = useExcluirEntrega(id)

  const [encerrando, setEncerrando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [confirmacao, setConfirmacao] = useState('')
  const [alunoAberto, setAlunoAberto] = useState<ResultadoAluno | null>(null)
  const [removendoEntrega, setRemovendoEntrega] = useState(false)

  const relatorio = useMemo(
    () => (gabarito.data && entregas.data ? consolidarTurma(gabarito.data, entregas.data) : null),
    [gabarito.data, entregas.data],
  )

  if (prova.isPending) return <Carregando />
  if (prova.isError) return <ErroCarregamento mensagem={traduzirErro(prova.error)} aoTentarDeNovo={() => void prova.refetch()} />
  if (!prova.data) {
    return (
      <EstadoVazio titulo="Prova não encontrada">
        <Link to="/professor/provas" className="font-semibold underline">
          Voltar para as provas
        </Link>
      </EstadoVazio>
    )
  }

  const dados = prova.data
  const disciplinas = Object.keys(dados.estrutura)
  const ativa = dados.status === 'ativa'
  const linkAluno = `${window.location.origin}/aluno/${dados.codigo}`

  function confirmarEncerramento() {
    encerrar.mutate(dados.id, {
      onSuccess: () => {
        setEncerrando(false)
        mostrar('Prova encerrada. Os alunos não conseguem mais entregar.', 'sucesso')
      },
      onError: (e) => {
        setEncerrando(false)
        mostrar(traduzirErro(e), 'erro')
      },
    })
  }

  function confirmarRemocaoEntrega() {
    if (!alunoAberto) return
    excluirEntregaMutation.mutate(alunoAberto.entregaId, {
      onSuccess: () => {
        setRemovendoEntrega(false)
        setAlunoAberto(null)
        mostrar('Entrega removida. O aluno pode entregar de novo.', 'sucesso')
      },
      onError: (e) => {
        setRemovendoEntrega(false)
        mostrar(traduzirErro(e), 'erro')
      },
    })
  }

  function confirmarExclusao() {
    excluir.mutate(dados.id, {
      onSuccess: () => {
        mostrar('Prova e entregas excluídas.', 'sucesso')
        navegar('/professor/provas', { replace: true })
      },
      onError: (e) => {
        setExcluindo(false)
        mostrar(traduzirErro(e), 'erro')
      },
    })
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(linkAluno)
      mostrar('Link copiado. Cole no grupo da turma.', 'sucesso')
    } catch {
      mostrar(`Copie manualmente: ${linkAluno}`, 'info')
    }
  }

  function exportar() {
    if (!relatorio) return
    baixarCsv(`resultados-${dados.codigo}.csv`, relatorioParaCsv(relatorio, disciplinas))
  }

  return (
    <div>
      <Link to="/professor/provas" className="inline-flex items-center gap-1.5 text-sm font-medium text-tinta/70 hover:text-tinta">
        <ArrowLeft aria-hidden className="size-4" />
        Provas
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <CopiarCodigo codigo={dados.codigo} tamanho="lg" />
            <SeloStatus status={dados.status} />
          </div>
          <h1 className="mt-3 text-3xl font-bold">{dados.tipoProva}</h1>
          <p className="mt-1 text-tinta/70">
            {dados.turma} · {totalQuestoes(dados.estrutura)} questões · criada em {formatarDataHora(dados.criadaEm)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {ativa && (
            <Button variante="secundario" onClick={copiarLink}>
              <Link2 aria-hidden className="size-4" />
              Copiar link para alunos
            </Button>
          )}
          <Button variante="secundario" onClick={exportar} disabled={!relatorio || relatorio.alunos.length === 0}>
            <Download aria-hidden className="size-4" />
            Baixar planilha
          </Button>
          {ativa && <Button onClick={() => setEncerrando(true)}>Encerrar prova</Button>}
        </div>
      </header>

      <section className="mt-8" aria-labelledby="resultados">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="resultados" className="text-xl font-bold">
            {ativa ? 'Entregas e resultado parcial' : 'Resultado final'}
          </h2>
          {relatorio && relatorio.alunos.length > 0 && (
            <p className="text-sm text-tinta/70">
              Média da turma:{' '}
              <strong className={clsx('font-display text-xl', corDoPercentual(relatorio.mediaTurma))}>
                {formatarPercentual(relatorio.mediaTurma)}
              </strong>{' '}
              · {relatorio.alunos.length} {relatorio.alunos.length === 1 ? 'aluno' : 'alunos'}
            </p>
          )}
        </div>

        <div className="mt-4">
          {(entregas.isPending || gabarito.isPending) && <Carregando texto="Corrigindo as entregas…" />}
          {(entregas.isError || gabarito.isError) && (
            <ErroCarregamento
              mensagem={traduzirErro(entregas.error ?? gabarito.error)}
              aoTentarDeNovo={() => {
                void entregas.refetch()
                void gabarito.refetch()
              }}
            />
          )}
          {relatorio && relatorio.alunos.length === 0 && (
            <EstadoVazio titulo="Ninguém entregou ainda">
              {ativa ? (
                <>
                  Passe o código <strong>{dados.codigo}</strong> para a turma. Esta tela atualiza sozinha quando chegar
                  uma entrega.
                </>
              ) : (
                'Esta prova foi encerrada sem entregas.'
              )}
            </EstadoVazio>
          )}

          {relatorio && relatorio.alunos.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-linha bg-folha">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <caption className="sr-only">Desempenho dos alunos, do maior para o menor aproveitamento</caption>
                <thead className="border-b-2 border-tinta">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-bold">
                      Aluno
                    </th>
                    {disciplinas.map((d) => (
                      <th key={d} scope="col" className="px-3 py-3 text-center font-bold">
                        {d}
                      </th>
                    ))}
                    <th scope="col" className="px-4 py-3 text-right font-bold">
                      Geral
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linha">
                  {relatorio.alunos.map((aluno, i) => (
                    <tr key={aluno.entregaId} className="hover:bg-papel">
                      <th scope="row" className="px-4 py-3 font-semibold">
                        <button
                          type="button"
                          onClick={() => setAlunoAberto(aluno)}
                          className="text-left underline decoration-linha underline-offset-4 hover:decoration-tinta"
                        >
                          <span className="mr-2 inline-block w-6 text-tinta/70 tabular-nums">{i + 1}º</span>
                          {aluno.nomeAluno}
                        </button>
                      </th>
                      {disciplinas.map((d) => {
                        const p = aluno.disciplinas[d]?.percentual ?? 0
                        return (
                          <td key={d} className={clsx('px-3 py-3 text-center font-semibold tabular-nums', corDoPercentual(p))}>
                            {formatarPercentual(p)}
                          </td>
                        )
                      })}
                      <td className={clsx('px-4 py-3 text-right font-display text-lg font-extrabold tabular-nums', corDoPercentual(aluno.percentual))}>
                        {formatarPercentual(aluno.percentual)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-tinta bg-papel">
                  <tr>
                    <th scope="row" className="px-4 py-3 font-bold">
                      Média da turma
                    </th>
                    {disciplinas.map((d) => (
                      <td key={d} className="px-3 py-3 text-center font-semibold tabular-nums">
                        {formatarPercentual(relatorio.mediaPorDisciplina[d] ?? 0)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{formatarPercentual(relatorio.mediaTurma)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="mt-12 border-t border-linha pt-6">
        <h2 className="text-base font-bold">Excluir prova</h2>
        <p className="mt-1 max-w-prose text-sm text-tinta/70">
          Remove a prova, o gabarito e todas as entregas dos alunos. Não dá para desfazer.
        </p>
        <Button
          variante="secundario"
          className="mt-3 border-caneta/40 text-caneta hover:border-caneta"
          onClick={() => {
            setConfirmacao('')
            setExcluindo(true)
          }}
        >
          Excluir esta prova
        </Button>
      </section>

      <Modal
        aberto={encerrando}
        aoFechar={() => !encerrar.isPending && setEncerrando(false)}
        titulo="Encerrar a prova?"
        descricao="Os alunos deixam de conseguir entregar. Você continua vendo os resultados."
        largura="sm"
        rodape={
          <>
            <Button variante="secundario" disabled={encerrar.isPending} onClick={() => setEncerrando(false)}>
              Continuar recebendo
            </Button>
            <Button carregando={encerrar.isPending} onClick={confirmarEncerramento}>
              Encerrar prova
            </Button>
          </>
        }
      >
        <p className="text-sm">
          {entregas.data?.length ?? 0} {entregas.data?.length === 1 ? 'cartão recebido' : 'cartões recebidos'} até agora.
        </p>
      </Modal>

      <Modal
        aberto={excluindo}
        aoFechar={() => !excluir.isPending && setExcluindo(false)}
        titulo="Excluir esta prova?"
        largura="sm"
        rodape={
          <>
            <Button variante="secundario" disabled={excluir.isPending} onClick={() => setExcluindo(false)}>
              Cancelar
            </Button>
            <Button
              variante="perigo"
              carregando={excluir.isPending}
              disabled={confirmacao !== PALAVRA_EXCLUSAO}
              onClick={confirmarExclusao}
            >
              Excluir definitivamente
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm">
          Isso apaga a prova {dados.codigo} e {entregas.data?.length ?? 0} entregas. Para confirmar, digite{' '}
          <strong>{PALAVRA_EXCLUSAO}</strong>.
        </p>
        <TextField
          label="Confirmação"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          autoComplete="off"
        />
      </Modal>

      <Modal
        aberto={alunoAberto !== null}
        aoFechar={() => setAlunoAberto(null)}
        titulo={alunoAberto?.nomeAluno ?? ''}
        descricao={
          alunoAberto
            ? `${alunoAberto.acertos} de ${alunoAberto.total} certas (${formatarPercentual(alunoAberto.percentual)})`
            : undefined
        }
        largura="md"
        rodape={
          <Button variante="secundario" className="border-caneta/40 text-caneta hover:border-caneta" onClick={() => setRemovendoEntrega(true)}>
            Remover esta entrega
          </Button>
        }
      >
        {alunoAberto && gabarito.data && (
          <CartaoCorrigido
            gabarito={gabarito.data}
            respostas={entregas.data?.find((e) => e.id === alunoAberto.entregaId)?.respostas ?? {}}
          />
        )}
      </Modal>

      <Modal
        aberto={removendoEntrega}
        aoFechar={() => !excluirEntregaMutation.isPending && setRemovendoEntrega(false)}
        titulo="Remover esta entrega?"
        descricao="Use para entregas de teste, falsas ou com nome errado."
        largura="sm"
        rodape={
          <>
            <Button variante="secundario" disabled={excluirEntregaMutation.isPending} onClick={() => setRemovendoEntrega(false)}>
              Cancelar
            </Button>
            <Button variante="perigo" carregando={excluirEntregaMutation.isPending} onClick={confirmarRemocaoEntrega}>
              Remover entrega
            </Button>
          </>
        }
      >
        <p className="text-sm">
          A entrega de <strong>{alunoAberto?.nomeAluno}</strong> será apagada e o nome fica livre para uma nova entrega.
        </p>
      </Modal>
    </div>
  )
}
