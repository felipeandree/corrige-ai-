import { describe, expect, it } from 'vitest'
import { consolidarTurma, corrigirEntrega } from './grading'
import { escaparCelula, relatorioParaCsv } from './csv'
import type { Entrega, Gabarito } from '@/types/domain'

const gabarito: Gabarito = {
  Português: ['A', 'B', 'C', 'D'],
  Matemática: ['E', 'E'],
}

const entrega = (id: string, nomeAluno: string, respostas: Entrega['respostas']): Entrega => ({
  id,
  avaliacaoId: 'av1',
  nomeAluno,
  respostas,
  enviadaEm: '2026-01-01T00:00:00Z',
})

describe('corrigirEntrega', () => {
  it('conta acertos por disciplina e no geral', () => {
    const r = corrigirEntrega(gabarito, entrega('1', 'Ana', { Português: ['A', 'B', 'C', 'A'], Matemática: ['E', 'A'] }))
    expect(r.disciplinas.Português).toEqual({ acertos: 3, total: 4, percentual: 75 })
    expect(r.disciplinas.Matemática).toEqual({ acertos: 1, total: 2, percentual: 50 })
    expect(r.acertos).toBe(4)
    expect(r.total).toBe(6)
    expect(r.percentual).toBeCloseTo(66.67, 1)
  })

  it('trata questões em branco ou disciplina ausente como erro', () => {
    const r = corrigirEntrega(gabarito, entrega('2', 'Bia', { Português: [null, null, null, null] }))
    expect(r.acertos).toBe(0)
    expect(r.disciplinas.Matemática?.percentual).toBe(0)
  })

  it('ignora respostas além do tamanho do gabarito', () => {
    const r = corrigirEntrega(
      gabarito,
      entrega('3', 'Caio', { Português: ['A', 'B', 'C', 'D', 'E'], Matemática: ['E', 'E'] }),
    )
    expect(r.acertos).toBe(6)
    expect(r.percentual).toBe(100)
  })
})

describe('consolidarTurma', () => {
  it('ordena do melhor para o pior e calcula médias', () => {
    const rel = consolidarTurma(gabarito, [
      entrega('2', 'Ana', { Português: ['A', 'A', 'A', 'A'], Matemática: ['A', 'A'] }),
      entrega('1', 'Zeca', { Português: ['A', 'B', 'C', 'D'], Matemática: ['E', 'E'] }),
    ])
    expect(rel.alunos.map((a) => a.nomeAluno)).toEqual(['Zeca', 'Ana'])
    expect(rel.mediaTurma).toBeCloseTo((100 + 100 / 6) / 2, 5)
    expect(rel.mediaPorDisciplina.Matemática).toBe(50)
  })

  it('não quebra sem entregas', () => {
    expect(consolidarTurma(gabarito, [])).toEqual({
      alunos: [],
      mediaTurma: 0,
      mediaPorDisciplina: { Português: 0, Matemática: 0 },
    })
  })
})

describe('csv', () => {
  it('neutraliza fórmulas e escapa aspas', () => {
    expect(escaparCelula('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"')
    expect(escaparCelula('Maria; Silva')).toBe('"Maria; Silva"')
    expect(escaparCelula('Ana')).toBe('Ana')
    expect(escaparCelula(80)).toBe('80')
  })

  it('gera cabeçalho e linhas', () => {
    const rel = consolidarTurma(gabarito, [
      entrega('1', 'Ana', { Português: ['A', 'B', 'C', 'D'], Matemática: ['E', 'A'] }),
    ])
    const csv = relatorioParaCsv(rel, ['Português', 'Matemática'])
    expect(csv.split('\r\n')).toEqual([
      'Aluno;Português (%);Matemática (%);Acertos;Total de questões;Aproveitamento geral (%)',
      'Ana;100;50;5;6;83',
    ])
  })
})
