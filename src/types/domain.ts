export const ALTERNATIVAS = ['A', 'B', 'C', 'D', 'E'] as const
export type Alternativa = (typeof ALTERNATIVAS)[number]

/** Disciplina -> quantidade de questões. */
export type Estrutura = Record<string, number>
/** Disciplina -> alternativa correta de cada questão. */
export type Gabarito = Record<string, Alternativa[]>
/** Disciplina -> resposta do aluno em cada questão (null = em branco). */
export type Respostas = Record<string, (Alternativa | null)[]>

export const TIPOS_PROVA = ['Avaliação Mensal', 'Avaliação Bimestral', 'Simulado Geral', 'Recuperação'] as const
export type TipoProva = (typeof TIPOS_PROVA)[number]

export type NivelEnsino = 'Médio' | 'Fundamental'
export type StatusAvaliacao = 'ativa' | 'encerrada'

export const TURMAS: Record<NivelEnsino, string[]> = {
  Médio: ['1º Ano Ensino Médio', '2º Ano Ensino Médio', '3º Ano Ensino Médio'],
  Fundamental: ['6º Ano Fundamental', '7º Ano Fundamental', '8º Ano Fundamental', '9º Ano Fundamental'],
}

export const DISCIPLINAS = [
  'Português',
  'Matemática',
  'História',
  'Geografia',
  'Ciências',
  'Física',
  'Química',
  'Inglês',
] as const

export const LIMITES = { questoesPorDisciplina: { min: 1, max: 20 } } as const

export interface Avaliacao {
  id: string
  codigo: string
  nomeProfessor: string
  tipoProva: TipoProva
  nivelEnsino: NivelEnsino
  turma: string
  estrutura: Estrutura
  status: StatusAvaliacao
  criadaEm: string
}

/** O que o aluno enxerga: nunca inclui o gabarito. */
export type AvaliacaoAluno = Pick<
  Avaliacao,
  'codigo' | 'tipoProva' | 'nivelEnsino' | 'turma' | 'nomeProfessor' | 'estrutura'
>

export interface Entrega {
  id: string
  avaliacaoId: string
  nomeAluno: string
  respostas: Respostas
  enviadaEm: string
}

export interface NovaAvaliacao {
  nomeProfessor: string
  tipoProva: TipoProva
  nivelEnsino: NivelEnsino
  turma: string
  gabarito: Gabarito
}

export type TipoFeedback = 'bug' | 'sugestao' | 'elogio' | 'duvida'
export type GravidadeFeedback = 'baixa' | 'media' | 'critica'

export interface NovoFeedback {
  tipo: TipoFeedback
  tela: string
  titulo: string
  descricao: string
  gravidade: GravidadeFeedback
  docenteNome: string
  docenteEmail: string
}
