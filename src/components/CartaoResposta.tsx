import { ALTERNATIVAS, type Alternativa, type Gabarito, type Respostas } from '@/types/domain'
import { formatarQuestao } from '@/lib/format'

type Marcacoes = Record<string, (Alternativa | null)[]>

interface CartaoRespostaProps {
  /** Disciplina -> número de questões. */
  estrutura: Record<string, number>
  valores: Marcacoes
  aoSelecionar: (disciplina: string, indice: number, alternativa: Alternativa) => void
  desabilitado?: boolean
}

/**
 * Cartão-resposta editável. Usado pelo aluno (responder) e pelo professor
 * (montar o gabarito): cada questão é um grupo de rádios nativos, então a
 * navegação por setas e os leitores de tela funcionam sem código extra.
 */
export function CartaoResposta({ estrutura, valores, aoSelecionar, desabilitado }: CartaoRespostaProps) {
  return (
    <div className="space-y-8">
      {Object.entries(estrutura).map(([disciplina, total]) => (
        <section key={disciplina} aria-labelledby={`disc-${disciplina}`}>
          <div className="mb-3 flex items-baseline justify-between border-b-2 border-tinta pb-2">
            <h3 id={`disc-${disciplina}`} className="text-lg font-bold">
              {disciplina}
            </h3>
            <span className="text-sm text-tinta/70">{total} questões</span>
          </div>
          <ol className="divide-y divide-linha">
            {Array.from({ length: total }, (_, i) => (
              <li key={i}>
                <fieldset className="flex items-center justify-between gap-3 py-2.5">
                  <legend className="sr-only">
                    {disciplina}, questão {i + 1}
                  </legend>
                  <span aria-hidden className="w-10 text-sm font-semibold tabular-nums text-tinta/70">
                    {formatarQuestao(i)}
                  </span>
                  <div className="flex gap-1.5 sm:gap-2.5">
                    {ALTERNATIVAS.map((alt) => (
                      <label key={alt} className="bolinha">
                        <input
                          type="radio"
                          name={`${disciplina}-${i}`}
                          value={alt}
                          checked={valores[disciplina]?.[i] === alt}
                          disabled={desabilitado}
                          onChange={() => aoSelecionar(disciplina, i, alt)}
                          className="sr-only"
                        />
                        <span aria-hidden>{alt}</span>
                        <span className="sr-only">alternativa {alt}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

interface CartaoCorrigidoProps {
  gabarito: Gabarito
  respostas: Respostas
}

/** Cartão somente leitura: acerto em verde, erro na caneta vermelha com a alternativa certa circulada. */
export function CartaoCorrigido({ gabarito, respostas }: CartaoCorrigidoProps) {
  return (
    <div className="space-y-6">
      {Object.entries(gabarito).map(([disciplina, corretas]) => (
        <section key={disciplina}>
          <h3 className="mb-2 border-b-2 border-tinta pb-1.5 text-base font-bold">{disciplina}</h3>
          <ol className="divide-y divide-linha">
            {corretas.map((correta, i) => {
              const marcada = respostas[disciplina]?.[i] ?? null
              const acertou = marcada === correta
              return (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <span className="w-10 text-sm font-semibold tabular-nums text-tinta/70">{formatarQuestao(i)}</span>
                  <div className="flex items-center gap-1.5">
                    {ALTERNATIVAS.map((alt) => {
                      const resultado = alt === marcada ? (acertou ? 'certa' : 'errada') : undefined
                      return (
                        <span
                          key={alt}
                          className="bolinha !size-8 !cursor-default"
                          data-resultado={resultado}
                          style={!acertou && alt === correta ? { borderColor: 'var(--color-acerto)', borderWidth: 3 } : undefined}
                        >
                          {alt}
                        </span>
                      )
                    })}
                  </div>
                  <span className="w-20 text-right text-xs font-semibold">
                    {marcada === null ? (
                      <span className="text-tinta/70">Em branco</span>
                    ) : acertou ? (
                      <span className="text-acerto">Acertou</span>
                    ) : (
                      <span className="text-caneta">Certa: {correta}</span>
                    )}
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
