import { DISCIPLINAS } from '@/types/domain'

/** jsonb não preserva a ordem das chaves; reordena pela ordem canônica das disciplinas. */
export function ordenarDisciplinas<T>(porDisciplina: Record<string, T>): Record<string, T> {
  const posicao = (d: string) => {
    const i = (DISCIPLINAS as readonly string[]).indexOf(d)
    return i === -1 ? DISCIPLINAS.length : i
  }
  return Object.fromEntries(
    Object.entries(porDisciplina).sort(([a], [b]) => posicao(a) - posicao(b) || a.localeCompare(b, 'pt-BR')),
  )
}

export const formatarPercentual = (valor: number) => `${Math.round(valor)}%`

export const formatarDataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export const formatarQuestao = (indice: number) => `Q${String(indice + 1).padStart(2, '0')}`

export const totalQuestoes = (estrutura: Record<string, number>) =>
  Object.values(estrutura).reduce((soma, qtd) => soma + qtd, 0)
