import { useState } from 'react'
import { ButtonLink } from '@/components/ui/Button'
import { ALTERNATIVAS, type Alternativa } from '@/types/domain'
import { formatarQuestao } from '@/lib/format'
import clsx from 'clsx'

const GABARITO_DEMO: Alternativa[] = ['B', 'D', 'A', 'C']

/** Demonstração do produto: marque uma alternativa e veja a correção acontecer. */
function CartaoDemonstracao() {
  const [marcadas, setMarcadas] = useState<(Alternativa | null)[]>([null, null, null, null])
  const acertos = marcadas.filter((m, i) => m === GABARITO_DEMO[i]).length
  const respondidas = marcadas.filter(Boolean).length

  return (
    <div className="rounded-md border-2 border-tinta bg-folha p-5 sm:p-6">
      <ol className="divide-y divide-linha">
        {GABARITO_DEMO.map((correta, i) => {
          const marcada = marcadas[i]
          return (
            <li key={i} className="flex items-center justify-between gap-3 py-3">
              <span className="w-10 text-sm font-semibold tabular-nums text-tinta/70">{formatarQuestao(i)}</span>
              <div role="group" aria-label={`Questão ${i + 1}`} className="flex gap-1.5 sm:gap-2.5">
                {ALTERNATIVAS.map((alt) => {
                  const resultado = marcada === alt ? (alt === correta ? 'certa' : 'errada') : undefined
                  const ehCertaNaoMarcada = marcada && marcada !== correta && alt === correta
                  return (
                    <button
                      key={alt}
                      type="button"
                      className="bolinha"
                      aria-pressed={marcada === alt}
                      aria-label={`Alternativa ${alt}`}
                      data-resultado={resultado}
                      style={ehCertaNaoMarcada ? { borderColor: 'var(--color-acerto)', borderWidth: 3 } : undefined}
                      onClick={() => setMarcadas((atual) => atual.map((m, j) => (j === i ? alt : m)))}
                    >
                      {alt}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ol>
      <p
        aria-live="polite"
        className={clsx('mt-4 border-t border-linha pt-4 text-sm', respondidas === 0 ? 'text-tinta/70' : 'font-semibold')}
      >
        {respondidas === 0
          ? 'Marque uma alternativa em cada questão.'
          : `${acertos} de ${GABARITO_DEMO.length} certas${respondidas < GABARITO_DEMO.length ? ' até agora' : ''}.`}
      </p>
    </div>
  )
}

export default function Home() {
  return (
    <div className="grid items-center gap-10 py-4 md:grid-cols-[1.1fr_1fr] md:gap-14 md:py-10">
      <div>
        <h1 className="text-4xl font-extrabold sm:text-5xl">Cartão-resposta online, nota da turma na hora.</h1>
        <p className="mt-5 max-w-prose text-lg text-tinta/80">
          Monte o gabarito, passe o código de 5 letras para a turma e acompanhe as entregas chegando. A correção
          é automática, sem pilha de papel.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink to="/entrar" className="px-6 py-3 text-base">
            Sou professor
          </ButtonLink>
          <ButtonLink to="/aluno" variante="secundario" className="px-6 py-3 text-base">
            Sou aluno
          </ButtonLink>
        </div>
      </div>
      <CartaoDemonstracao />
    </div>
  )
}
