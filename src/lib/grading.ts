import type { Entrega, Gabarito } from '@/types/domain'

export interface DesempenhoDisciplina {
  acertos: number
  total: number
  /** 0 a 100. */
  percentual: number
}

export interface ResultadoAluno {
  entregaId: string
  nomeAluno: string
  acertos: number
  total: number
  percentual: number
  disciplinas: Record<string, DesempenhoDisciplina>
}

export interface RelatorioTurma {
  alunos: ResultadoAluno[]
  /** Média dos percentuais gerais; 0 quando não há entregas. */
  mediaTurma: number
  mediaPorDisciplina: Record<string, number>
}

const percentual = (acertos: number, total: number) => (total > 0 ? (acertos / total) * 100 : 0)

const media = (valores: number[]) =>
  valores.length > 0 ? valores.reduce((soma, v) => soma + v, 0) / valores.length : 0

/** Corrige uma entrega. Questão em branco ou ausente conta como erro. */
export function corrigirEntrega(gabarito: Gabarito, entrega: Entrega): ResultadoAluno {
  const disciplinas: Record<string, DesempenhoDisciplina> = {}
  let acertos = 0
  let total = 0

  for (const [disciplina, corretas] of Object.entries(gabarito)) {
    const marcadas = entrega.respostas[disciplina] ?? []
    const acertosDisciplina = corretas.filter((correta, i) => marcadas[i] === correta).length

    disciplinas[disciplina] = {
      acertos: acertosDisciplina,
      total: corretas.length,
      percentual: percentual(acertosDisciplina, corretas.length),
    }
    acertos += acertosDisciplina
    total += corretas.length
  }

  return {
    entregaId: entrega.id,
    nomeAluno: entrega.nomeAluno,
    acertos,
    total,
    percentual: percentual(acertos, total),
    disciplinas,
  }
}

/** Corrige todas as entregas e devolve o ranking e as médias da turma. */
export function consolidarTurma(gabarito: Gabarito, entregas: Entrega[]): RelatorioTurma {
  const alunos = entregas
    .map((entrega) => corrigirEntrega(gabarito, entrega))
    .sort((a, b) => b.percentual - a.percentual || a.nomeAluno.localeCompare(b.nomeAluno, 'pt-BR'))

  const mediaPorDisciplina: Record<string, number> = {}
  for (const disciplina of Object.keys(gabarito)) {
    mediaPorDisciplina[disciplina] = media(alunos.map((a) => a.disciplinas[disciplina]?.percentual ?? 0))
  }

  return { alunos, mediaTurma: media(alunos.map((a) => a.percentual)), mediaPorDisciplina }
}

export const NOTA_DE_CORTE = 60
export const aprovado = (valor: number) => valor >= NOTA_DE_CORTE
