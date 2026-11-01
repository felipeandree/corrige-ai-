import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { enviarFeedback } from '@/services/feedback'
import { traduzirErro } from '@/lib/errors'
import { Button } from '@/components/ui/Button'
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import type { GravidadeFeedback, TipoFeedback } from '@/types/domain'

const TIPOS: { valor: TipoFeedback; titulo: string; ajuda: string }[] = [
  { valor: 'bug', titulo: 'Erro', ajuda: 'Algo travou ou deu errado' },
  { valor: 'sugestao', titulo: 'Sugestão', ajuda: 'Uma ideia para melhorar' },
  { valor: 'duvida', titulo: 'Dificuldade', ajuda: 'Não entendi como usar' },
  { valor: 'elogio', titulo: 'Elogio', ajuda: 'Algo que funcionou bem' },
]

const GRAVIDADES: { valor: GravidadeFeedback; rotulo: string }[] = [
  { valor: 'baixa', rotulo: 'Baixo: detalhe ou ideia' },
  { valor: 'media', rotulo: 'Médio: atrapalhou' },
  { valor: 'critica', rotulo: 'Crítico: impediu o uso' },
]

const TELAS = ['Painel', 'Lista de provas', 'Criação de prova', 'Resultados da prova', 'Área do aluno', 'Login', 'Outra']

export default function Feedback() {
  const { user, nomeExibicao } = useAuth()
  const { mostrar } = useToast()

  const [tipo, setTipo] = useState<TipoFeedback>('bug')
  const [tela, setTela] = useState(TELAS[0] ?? '')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [gravidade, setGravidade] = useState<GravidadeFeedback>('media')

  const envio = useMutation({
    mutationFn: enviarFeedback,
    onError: (e) => mostrar(traduzirErro(e), 'erro'),
  })

  function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    envio.mutate({
      tipo,
      tela,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      gravidade,
      docenteNome: nomeExibicao,
      docenteEmail: user?.email ?? '',
    })
  }

  function enviarOutro() {
    setTitulo('')
    setDescricao('')
    envio.reset()
  }

  if (envio.isSuccess) {
    return (
      <div className="mx-auto max-w-md py-8 text-center">
        <CheckCircle2 aria-hidden className="mx-auto size-12 text-acerto" />
        <h1 className="mt-4 text-3xl font-bold">Opinião enviada</h1>
        <p className="mt-3 text-tinta/80">Obrigado. A equipe lê cada mensagem.</p>
        <Button variante="secundario" className="mt-6" onClick={enviarOutro}>
          Enviar outra
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold">Enviar opinião</h1>
      <p className="mt-2 text-tinta/70">Conte o que deu certo, o que falhou ou o que falta. Quanto mais detalhe, mais rápido resolvemos.</p>

      <form onSubmit={aoEnviar} className="mt-8 space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Sobre o que é?</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIPOS.map((t) => (
              <label
                key={t.valor}
                className={clsx(
                  'cursor-pointer rounded-md border p-3 has-[:focus-visible]:outline-3',
                  tipo === t.valor ? 'border-tinta bg-tinta/5' : 'border-linha bg-folha hover:border-tinta',
                )}
              >
                <input
                  type="radio"
                  name="tipo"
                  value={t.valor}
                  checked={tipo === t.valor}
                  onChange={() => setTipo(t.valor)}
                  className="sr-only"
                />
                <span className="block text-sm font-bold">{t.titulo}</span>
                <span className="block text-xs text-tinta/70">{t.ajuda}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <SelectField label="Em qual tela?" value={tela} onChange={(e) => setTela(e.target.value)}>
          {TELAS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </SelectField>

        <TextField
          label="Resumo"
          required
          minLength={3}
          maxLength={140}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: A média da turma não apareceu"
        />

        <TextAreaField
          label="O que aconteceu?"
          required
          minLength={10}
          maxLength={4000}
          rows={5}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          dica="Conte o que você tentou fazer, o que viu na tela e o que esperava ver."
        />

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Qual o impacto?</legend>
          <div className="flex flex-wrap gap-4">
            {GRAVIDADES.map((g) => (
              <label key={g.valor} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="gravidade"
                  value={g.valor}
                  checked={gravidade === g.valor}
                  onChange={() => setGravidade(g.valor)}
                  className="size-4 accent-tinta"
                />
                {g.rotulo}
              </label>
            ))}
          </div>
        </fieldset>

        <Button type="submit" carregando={envio.isPending} className="w-full py-3">
          Enviar opinião
        </Button>
      </form>
    </div>
  )
}
