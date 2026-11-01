import { useState } from 'react'
import { useNavigate } from 'react-router'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useCriarAvaliacao } from '@/hooks/useAvaliacoes'
import { traduzirErro } from '@/lib/errors'
import { totalQuestoes } from '@/lib/format'
import { CartaoResposta } from '@/components/CartaoResposta'
import { Button } from '@/components/ui/Button'
import { SelectField, TextField } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import {
  DISCIPLINAS,
  LIMITES,
  TIPOS_PROVA,
  TURMAS,
  type Alternativa,
  type Estrutura,
  type Gabarito,
  type NivelEnsino,
  type TipoProva,
} from '@/types/domain'

const PASSOS = ['Dados da prova', 'Número de questões', 'Gabarito'] as const
const { min: MIN_QUESTOES, max: MAX_QUESTOES } = LIMITES.questoesPorDisciplina

type GabaritoParcial = Record<string, (Alternativa | null)[]>

export default function NovaProva() {
  const { nomeExibicao } = useAuth()
  const { mostrar } = useToast()
  const navegar = useNavigate()
  const criar = useCriarAvaliacao()

  const [passo, setPasso] = useState(0)
  const [nomeProfessor, setNomeProfessor] = useState(nomeExibicao)
  const [tipoProva, setTipoProva] = useState<TipoProva>(TIPOS_PROVA[0])
  const [nivel, setNivel] = useState<NivelEnsino>('Médio')
  const [turma, setTurma] = useState(TURMAS.Médio[0] ?? '')
  const [disciplinas, setDisciplinas] = useState<string[]>(['Português', 'Matemática'])
  const [quantidades, setQuantidades] = useState<Record<string, number>>({})
  const [gabarito, setGabarito] = useState<GabaritoParcial>({})
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState<string>()

  const estrutura: Estrutura = Object.fromEntries(disciplinas.map((d) => [d, quantidades[d] ?? 5]))

  function trocarNivel(novo: NivelEnsino) {
    setNivel(novo)
    setTurma(TURMAS[novo][0] ?? '')
  }

  function alternarDisciplina(disciplina: string) {
    setDisciplinas((atuais) =>
      atuais.includes(disciplina) ? atuais.filter((d) => d !== disciplina) : [...atuais, disciplina],
    )
  }

  function avancarDoPasso1() {
    if (nomeProfessor.trim().length < 2) return setErro('Informe o nome do professor.')
    if (disciplinas.length === 0) return setErro('Selecione pelo menos uma disciplina.')
    setErro(undefined)
    setPasso(1)
  }

  function avancarDoPasso2() {
    const invalida = disciplinas.find((d) => {
      const q = estrutura[d] ?? 0
      return !Number.isInteger(q) || q < MIN_QUESTOES || q > MAX_QUESTOES
    })
    if (invalida) return setErro(`${invalida}: use entre ${MIN_QUESTOES} e ${MAX_QUESTOES} questões.`)

    setErro(undefined)
    // Preserva marcações já feitas quando o professor volta e ajusta as quantidades.
    setGabarito(
      Object.fromEntries(
        disciplinas.map((d) => [d, Array.from({ length: estrutura[d] ?? 0 }, (_, i) => gabarito[d]?.[i] ?? null)]),
      ),
    )
    setPasso(2)
  }

  function revisar() {
    const faltando = Object.values(gabarito).flat().filter((r) => r === null).length
    if (faltando > 0) {
      return setErro(`Faltam ${faltando} ${faltando === 1 ? 'questão' : 'questões'} no gabarito.`)
    }
    setErro(undefined)
    setConfirmando(true)
  }

  function criarProva() {
    criar.mutate(
      { nomeProfessor: nomeProfessor.trim(), tipoProva, nivelEnsino: nivel, turma, gabarito: gabarito as Gabarito },
      {
        onSuccess: (codigo) => {
          mostrar(`Prova criada. Código para a turma: ${codigo}`, 'sucesso')
          navegar('/professor/provas', { replace: true })
        },
        onError: (e) => {
          setConfirmando(false)
          mostrar(traduzirErro(e), 'erro')
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold">Criar prova</h1>

      <ol className="mt-6 flex gap-2" aria-label="Etapas">
        {PASSOS.map((rotulo, i) => (
          <li
            key={rotulo}
            aria-current={i === passo ? 'step' : undefined}
            className={clsx(
              'flex-1 border-t-4 pt-2 text-sm',
              i < passo && 'border-acerto font-medium text-tinta/70',
              i === passo && 'border-tinta font-bold',
              i > passo && 'border-linha text-tinta/70',
            )}
          >
            {rotulo}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-md border border-linha bg-folha p-5 sm:p-7">
        {passo === 0 && (
          <div className="space-y-5">
            <TextField
              label="Nome do professor"
              maxLength={120}
              value={nomeProfessor}
              onChange={(e) => setNomeProfessor(e.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectField label="Tipo de prova" value={tipoProva} onChange={(e) => setTipoProva(e.target.value as TipoProva)}>
                {TIPOS_PROVA.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </SelectField>
              <SelectField label="Nível de ensino" value={nivel} onChange={(e) => trocarNivel(e.target.value as NivelEnsino)}>
                <option value="Médio">Ensino Médio</option>
                <option value="Fundamental">Ensino Fundamental</option>
              </SelectField>
              <SelectField label="Turma" value={turma} onChange={(e) => setTurma(e.target.value)}>
                {TURMAS[nivel].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </SelectField>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium">Disciplinas desta prova</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DISCIPLINAS.map((d) => (
                  <label
                    key={d}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-linha px-3 py-2.5 text-sm has-[:checked]:border-tinta has-[:checked]:bg-tinta/5"
                  >
                    <input
                      type="checkbox"
                      checked={disciplinas.includes(d)}
                      onChange={() => alternarDisciplina(d)}
                      className="size-4 accent-tinta"
                    />
                    {d}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {passo === 1 && (
          <div>
            <h2 className="text-xl font-bold">Quantas questões tem cada disciplina?</h2>
            <p className="mt-1 text-sm text-tinta/70">
              De {MIN_QUESTOES} a {MAX_QUESTOES} questões de múltipla escolha (A a E).
            </p>
            <div className="mt-5 space-y-3">
              {disciplinas.map((d) => (
                <div key={d} className="flex items-center justify-between gap-4 rounded-md border border-linha px-4 py-3">
                  <label htmlFor={`qtd-${d}`} className="font-semibold">
                    {d}
                  </label>
                  <input
                    id={`qtd-${d}`}
                    type="number"
                    inputMode="numeric"
                    min={MIN_QUESTOES}
                    max={MAX_QUESTOES}
                    value={Number.isNaN(quantidades[d]) ? '' : (quantidades[d] ?? 5)}
                    onChange={(e) => setQuantidades((q) => ({ ...q, [d]: e.target.valueAsNumber }))}
                    className="w-24 rounded-md border border-linha px-3 py-2 text-center text-sm font-semibold"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {passo === 2 && (
          <div>
            <h2 className="text-xl font-bold">Marque a alternativa correta de cada questão</h2>
            <p className="mt-1 mb-6 text-sm text-tinta/70">Só você vê este gabarito. Os alunos recebem apenas o cartão em branco.</p>
            <CartaoResposta
              estrutura={estrutura}
              valores={gabarito}
              aoSelecionar={(disciplina, indice, alternativa) =>
                setGabarito((atual) => ({
                  ...atual,
                  [disciplina]: (atual[disciplina] ?? []).map((r, i) => (i === indice ? alternativa : r)),
                }))
              }
            />
          </div>
        )}

        {erro && (
          <p role="alert" className="mt-5 text-sm font-semibold text-caneta">
            {erro}
          </p>
        )}

        <div className="mt-7 flex items-center justify-between border-t border-linha pt-5">
          {passo === 0 ? (
            <Button variante="texto" onClick={() => navegar('/professor')}>
              Cancelar
            </Button>
          ) : (
            <Button
              variante="secundario"
              onClick={() => {
                setErro(undefined)
                setPasso(passo - 1)
              }}
            >
              Voltar
            </Button>
          )}
          {passo === 0 && <Button onClick={avancarDoPasso1}>Continuar</Button>}
          {passo === 1 && <Button onClick={avancarDoPasso2}>Montar gabarito</Button>}
          {passo === 2 && <Button onClick={revisar}>Revisar e criar</Button>}
        </div>
      </div>

      <Modal
        aberto={confirmando}
        aoFechar={() => !criar.isPending && setConfirmando(false)}
        titulo="Criar esta prova?"
        descricao="Ao confirmar, geramos o código de 5 letras e os alunos já podem responder."
        largura="sm"
        rodape={
          <>
            <Button variante="secundario" disabled={criar.isPending} onClick={() => setConfirmando(false)}>
              Voltar
            </Button>
            <Button carregando={criar.isPending} onClick={criarProva}>
              Criar e gerar código
            </Button>
          </>
        }
      >
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-tinta/70">Prova</dt>
            <dd className="font-semibold">
              {tipoProva} · {turma}
            </dd>
          </div>
          <div>
            <dt className="text-tinta/70">Professor</dt>
            <dd className="font-semibold">{nomeProfessor.trim()}</dd>
          </div>
          <div>
            <dt className="text-tinta/70">Questões</dt>
            <dd className="font-semibold">
              {totalQuestoes(estrutura)} no total ({disciplinas.map((d) => `${d} ${estrutura[d]}`).join(', ')})
            </dd>
          </div>
        </dl>
      </Modal>
    </div>
  )
}
