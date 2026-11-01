import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { buscarAvaliacaoAluno, enviarEntrega } from '@/services/avaliacoes'
import { traduzirErro } from '@/lib/errors'
import { formatarQuestao, totalQuestoes } from '@/lib/format'
import { useToast } from '@/contexts/ToastContext'
import { CartaoResposta } from '@/components/CartaoResposta'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/Field'
import { Carregando, ErroCarregamento, EstadoVazio } from '@/components/ui/feedback'
import type { Alternativa, Estrutura, Respostas } from '@/types/domain'

const respostasEmBranco = (estrutura: Estrutura): Respostas =>
  Object.fromEntries(Object.entries(estrutura).map(([disciplina, qtd]) => [disciplina, Array<Alternativa | null>(qtd).fill(null)]))

const chaveRascunho = (codigo: string) => `corrigeai:rascunho:${codigo}`
const chaveEntregue = (codigo: string) => `corrigeai:entregue:${codigo}`

function lerEntregue(codigo: string): string | null {
  try {
    return localStorage.getItem(chaveEntregue(codigo))
  } catch {
    return null
  }
}

/** O rascunho sobrevive a um F5 acidental, mas só é aceito se ainda bater com a estrutura da prova. */
function lerRascunho(codigo: string, estrutura: Estrutura): { nome: string; respostas: Respostas } | null {
  try {
    const bruto = sessionStorage.getItem(chaveRascunho(codigo))
    if (!bruto) return null
    const { nome, respostas } = JSON.parse(bruto) as { nome: string; respostas: Respostas }
    const confere = Object.entries(estrutura).every(([d, qtd]) => respostas[d]?.length === qtd)
    return confere && typeof nome === 'string' ? { nome, respostas } : null
  } catch {
    return null
  }
}

interface FormularioProps {
  codigo: string
  prova: NonNullable<Awaited<ReturnType<typeof buscarAvaliacaoAluno>>>
}

function Formulario({ codigo, prova }: FormularioProps) {
  const { mostrar } = useToast()
  const [rascunho] = useState(() => lerRascunho(codigo, prova.estrutura))
  const [nome, setNome] = useState(rascunho?.nome ?? '')
  const [respostas, setRespostas] = useState<Respostas>(() => rascunho?.respostas ?? respostasEmBranco(prova.estrutura))
  const [revisando, setRevisando] = useState(false)
  const [entregueAntes, setEntregueAntes] = useState(() => lerEntregue(codigo))
  const [erroNome, setErroNome] = useState<string>()

  const total = totalQuestoes(prova.estrutura)
  const respondidas = useMemo(
    () => Object.values(respostas).reduce((soma, lista) => soma + lista.filter(Boolean).length, 0),
    [respostas],
  )
  const emBranco = useMemo(
    () =>
      Object.entries(respostas).flatMap(([disciplina, lista]) =>
        lista.flatMap((r, i) => (r === null ? [`${disciplina} ${formatarQuestao(i)}`] : [])),
      ),
    [respostas],
  )

  useEffect(() => {
    try {
      sessionStorage.setItem(chaveRascunho(codigo), JSON.stringify({ nome, respostas }))
    } catch {
      /* armazenamento indisponível: o rascunho é só uma conveniência */
    }
  }, [codigo, nome, respostas])

  const envio = useMutation({
    mutationFn: () => enviarEntrega(codigo, nome.trim(), respostas),
    onSuccess: () => {
      try {
        localStorage.setItem(chaveEntregue(codigo), nome.trim())
        sessionStorage.removeItem(chaveRascunho(codigo))
      } catch {
        /* ignorado */
      }
      setRevisando(false)
    },
    onError: (e) => {
      setRevisando(false)
      mostrar(traduzirErro(e), 'erro')
    },
  })

  if (entregueAntes && !envio.isSuccess) {
    return (
      <div className="mx-auto max-w-md py-8 text-center">
        <CheckCircle2 aria-hidden className="mx-auto size-12 text-acerto" />
        <h1 className="mt-4 text-3xl font-bold">Você já entregou esta prova</h1>
        <p className="mt-3 text-tinta/80">
          Neste aparelho, a entrega de <strong>{entregueAntes}</strong> já foi recebida.
        </p>
        <Button
          variante="secundario"
          className="mt-6"
          onClick={() => {
            try {
              localStorage.removeItem(chaveEntregue(codigo))
            } catch {
              /* ignorado */
            }
            setEntregueAntes(null)
          }}
        >
          Outro aluno vai entregar neste aparelho
        </Button>
      </div>
    )
  }

  if (envio.isSuccess) {
    return (
      <div className="mx-auto max-w-md py-8 text-center">
        <CheckCircle2 aria-hidden className="mx-auto size-12 text-acerto" />
        <h1 className="mt-4 text-3xl font-bold">Prova entregue</h1>
        <p className="mt-3 text-tinta/80">
          Recebemos o cartão de <strong>{nome.trim()}</strong> com {respondidas} de {total} questões respondidas. O
          professor divulga a nota.
        </p>
        <ButtonLink to="/" variante="secundario" className="mt-6">
          Voltar ao início
        </ButtonLink>
      </div>
    )
  }

  function aoRevisar() {
    if (nome.trim().length < 2) {
      setErroNome('Digite seu nome completo antes de entregar.')
      document.getElementById('nome-aluno')?.focus()
      return
    }
    setErroNome(undefined)
    setRevisando(true)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header>
        <p className="text-sm font-semibold text-tinta/70">
          {prova.tipoProva} · {prova.turma}
        </p>
        <h1 className="mt-1 text-3xl font-bold">Prova {codigo}</h1>
        <p className="mt-1 text-tinta/70">Prof. {prova.nomeProfessor}</p>
      </header>

      <div className="mt-6">
        <TextField
          id="nome-aluno"
          label="Seu nome completo"
          autoComplete="name"
          maxLength={120}
          value={nome}
          onChange={(e) => {
            setNome(e.target.value)
            setErroNome(undefined)
          }}
          erro={erroNome}
        />
      </div>

      <div className="sticky top-0 z-10 -mx-4 mt-6 border-y border-linha bg-papel/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-md sm:border">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>
            {respondidas} de {total} respondidas
          </span>
          <span className="tabular-nums">{Math.round((respondidas / total) * 100)}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="Progresso do cartão-resposta"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={respondidas}
          className="mt-2 h-2 overflow-hidden rounded-full bg-linha"
        >
          <div className="h-full bg-tinta transition-[width]" style={{ width: `${(respondidas / total) * 100}%` }} />
        </div>
      </div>

      <div className="mt-6 rounded-md border border-linha bg-folha p-5 sm:p-6">
        <CartaoResposta
          estrutura={prova.estrutura}
          valores={respostas}
          aoSelecionar={(disciplina, indice, alternativa) =>
            setRespostas((atual) => ({
              ...atual,
              [disciplina]: (atual[disciplina] ?? []).map((r, i) => (i === indice ? alternativa : r)),
            }))
          }
        />
      </div>

      <Button onClick={aoRevisar} className="mt-6 w-full py-3.5 text-base">
        Revisar e entregar
      </Button>

      <Modal
        aberto={revisando}
        aoFechar={() => !envio.isPending && setRevisando(false)}
        titulo="Confirmar entrega"
        descricao="Depois de entregar, não dá para alterar as respostas."
        largura="sm"
        rodape={
          <>
            <Button variante="secundario" disabled={envio.isPending} onClick={() => setRevisando(false)}>
              Voltar e revisar
            </Button>
            <Button carregando={envio.isPending} onClick={() => envio.mutate()}>
              Entregar agora
            </Button>
          </>
        }
      >
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-tinta/70">Aluno</dt>
            <dd className="font-semibold">{nome.trim()}</dd>
          </div>
          <div>
            <dt className="text-tinta/70">Respondidas</dt>
            <dd className="font-semibold">
              {respondidas} de {total}
            </dd>
          </div>
        </dl>
        {emBranco.length > 0 && (
          <div className="mt-4 rounded-md border border-caneta/30 bg-caneta/5 p-3 text-sm">
            <p className="font-semibold text-caneta">
              {emBranco.length} {emBranco.length === 1 ? 'questão em branco' : 'questões em branco'}
            </p>
            <p className="mt-1 text-tinta/80">{emBranco.slice(0, 8).join(', ')}{emBranco.length > 8 ? '…' : ''}</p>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default function AlunoProva() {
  const { codigo = '' } = useParams()
  const codigoNormalizado = codigo.toUpperCase()

  const consulta = useQuery({
    queryKey: ['prova-aluno', codigoNormalizado],
    queryFn: () => buscarAvaliacaoAluno(codigoNormalizado),
    enabled: /^[A-Z]{5}$/.test(codigoNormalizado),
    staleTime: 60_000,
  })

  if (!/^[A-Z]{5}$/.test(codigoNormalizado)) {
    return (
      <EstadoVazio titulo="Código inválido">
        O código tem 5 letras. <Link to="/aluno" className="font-semibold underline">Digitar de novo</Link>
      </EstadoVazio>
    )
  }
  if (consulta.isPending) return <Carregando texto="Abrindo a prova…" />
  if (consulta.isError) return <ErroCarregamento mensagem={traduzirErro(consulta.error)} aoTentarDeNovo={() => void consulta.refetch()} />
  if (!consulta.data) {
    return (
      <EstadoVazio titulo="Prova não encontrada ou já encerrada">
        Confira o código <strong>{codigoNormalizado}</strong> com o professor.{' '}
        <Link to="/aluno" className="font-semibold underline">
          Tentar outro código
        </Link>
      </EstadoVazio>
    )
  }

  return <Formulario codigo={codigoNormalizado} prova={consulta.data} />
}
