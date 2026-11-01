import { supabase } from '@/lib/supabase'
import { AppError, traduzirErro } from '@/lib/errors'
import { ordenarDisciplinas } from '@/lib/format'
import type {
  Avaliacao,
  AvaliacaoAluno,
  Entrega,
  Estrutura,
  Gabarito,
  NivelEnsino,
  NovaAvaliacao,
  Respostas,
  StatusAvaliacao,
  TipoProva,
} from '@/types/domain'

interface AvaliacaoRow {
  id: string
  codigo: string
  nome_professor: string
  tipo_prova: TipoProva
  nivel_ensino: NivelEnsino
  turma: string
  estrutura: Estrutura
  status: StatusAvaliacao
  created_at: string
}

interface EntregaRow {
  id: string
  avaliacao_id: string
  nome_aluno: string
  respostas: Respostas
  created_at: string
}

export interface AvaliacaoComContagem extends Avaliacao {
  totalEntregas: number
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const falhar = (erro: unknown): never => {
  throw new AppError(traduzirErro(erro), { cause: erro })
}

const paraAvaliacao = (row: AvaliacaoRow): Avaliacao => ({
  id: row.id,
  codigo: row.codigo,
  nomeProfessor: row.nome_professor,
  tipoProva: row.tipo_prova,
  nivelEnsino: row.nivel_ensino,
  turma: row.turma,
  estrutura: ordenarDisciplinas(row.estrutura),
  status: row.status,
  criadaEm: row.created_at,
})

export const paraEntrega = (row: EntregaRow): Entrega => ({
  id: row.id,
  avaliacaoId: row.avaliacao_id,
  nomeAluno: row.nome_aluno,
  respostas: row.respostas,
  enviadaEm: row.created_at,
})

// ---------------------------------------------------------------- professor

export async function listarAvaliacoes(): Promise<AvaliacaoComContagem[]> {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select('*, entregas(count)')
    .order('created_at', { ascending: false })
    .returns<(AvaliacaoRow & { entregas: { count: number }[] })[]>()
  if (error) return falhar(error)
  return data.map((row) => ({ ...paraAvaliacao(row), totalEntregas: row.entregas[0]?.count ?? 0 }))
}

export async function buscarAvaliacao(id: string): Promise<Avaliacao | null> {
  if (!UUID.test(id)) return null
  const { data, error } = await supabase
    .from('avaliacoes')
    .select('*')
    .eq('id', id)
    .maybeSingle<AvaliacaoRow>()
  if (error) return falhar(error)
  return data ? paraAvaliacao(data) : null
}

export async function buscarGabarito(avaliacaoId: string): Promise<Gabarito> {
  const { data, error } = await supabase
    .from('gabaritos')
    .select('respostas')
    .eq('avaliacao_id', avaliacaoId)
    .single<{ respostas: Gabarito }>()
  if (error) return falhar(error)
  return ordenarDisciplinas(data.respostas)
}

export async function listarEntregas(avaliacaoId: string): Promise<Entrega[]> {
  const { data, error } = await supabase
    .from('entregas')
    .select('*')
    .eq('avaliacao_id', avaliacaoId)
    .order('created_at', { ascending: true })
    .returns<EntregaRow[]>()
  if (error) return falhar(error)
  return data.map(paraEntrega)
}

/** Cria a avaliação e o gabarito de forma atômica. Devolve o código de 5 letras. */
export async function criarAvaliacao(nova: NovaAvaliacao): Promise<string> {
  const { data, error } = await supabase.rpc('criar_avaliacao', {
    p_nome_professor: nova.nomeProfessor,
    p_tipo_prova: nova.tipoProva,
    p_nivel_ensino: nova.nivelEnsino,
    p_turma: nova.turma,
    p_gabarito: nova.gabarito,
  })
  if (error) return falhar(error)
  return data as string
}

export async function encerrarAvaliacao(id: string): Promise<void> {
  const { data, error } = await supabase.from('avaliacoes').update({ status: 'encerrada' }).eq('id', id).select('id')
  if (error) falhar(error)
  if (!data?.length) throw new AppError('Não foi possível encerrar a prova. Atualize a página e tente de novo.')
}

export async function excluirAvaliacao(id: string): Promise<void> {
  const { data, error } = await supabase.from('avaliacoes').delete().eq('id', id).select('id')
  if (error) falhar(error)
  if (!data?.length) throw new AppError('Não foi possível excluir a prova. Atualize a página e tente de novo.')
}

export async function excluirEntrega(id: string): Promise<void> {
  const { data, error } = await supabase.from('entregas').delete().eq('id', id).select('id')
  if (error) falhar(error)
  if (!data?.length) throw new AppError('Não foi possível remover a entrega. Atualize a página e tente de novo.')
}

// -------------------------------------------------------------------- aluno

export async function buscarAvaliacaoAluno(codigo: string): Promise<AvaliacaoAluno | null> {
  const { data, error } = await supabase.rpc('buscar_avaliacao_aluno', { p_codigo: codigo })
  if (error) return falhar(error)

  const linha = (data as Omit<AvaliacaoRow, 'id' | 'status' | 'created_at'>[] | null)?.[0]
  if (!linha) return null
  return {
    codigo: linha.codigo,
    tipoProva: linha.tipo_prova,
    nivelEnsino: linha.nivel_ensino,
    turma: linha.turma,
    nomeProfessor: linha.nome_professor,
    estrutura: ordenarDisciplinas(linha.estrutura),
  }
}

export async function enviarEntrega(codigo: string, nome: string, respostas: Respostas): Promise<void> {
  const { error } = await supabase.rpc('enviar_entrega', {
    p_codigo: codigo,
    p_nome: nome,
    p_respostas: respostas,
  })
  if (error) falhar(error)
}
