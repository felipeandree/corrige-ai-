/**
 * Backend falso para testar o app sem Supabase (`npm run dev:mock`).
 * Implementa só a parte da API do supabase-js que o app usa e guarda tudo no
 * localStorage. Reproduz as regras do SQL (dono da prova, código, duplicidade,
 * validação do cartão) para que o fluxo se comporte como em produção.
 * Nunca entra no build de produção: o ramo é eliminado quando VITE_MOCK não é "true".
 */
import type { SupabaseClient } from '@supabase/supabase-js'

type Linha = Record<string, unknown>
type Tabela = 'avaliacoes' | 'gabaritos' | 'entregas' | 'feedbacks'

interface Usuario {
  id: string
  email: string
  senha: string
  nome: string
}

interface Banco {
  usuarios: Usuario[]
  avaliacoes: Linha[]
  gabaritos: Linha[]
  entregas: Linha[]
  feedbacks: Linha[]
}

interface Resultado {
  data: unknown
  error: { message: string } | null
}

const CHAVE_BANCO = 'corrigeai:mock:banco'
const CHAVE_SESSAO = 'corrigeai:mock:sessao'
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const ALTERNATIVAS = ['A', 'B', 'C', 'D', 'E']

export const CREDENCIAIS_DEMO = { email: 'professor@demo.com', senha: 'demo1234' }

// ------------------------------------------------------------------ banco local

const novoId = () => crypto.randomUUID()
const agora = () => new Date().toISOString()

function semear(): Banco {
  const professorId = novoId()
  const avaliacaoId = novoId()
  const estrutura = { Português: 5, Matemática: 5 }
  const gabarito = { Português: ['A', 'B', 'C', 'D', 'E'], Matemática: ['B', 'C', 'A', 'E', 'D'] }
  const entrega = (nome: string, respostas: Record<string, (string | null)[]>) => ({
    id: novoId(),
    avaliacao_id: avaliacaoId,
    nome_aluno: nome,
    nome_normalizado: nome.toLowerCase(),
    respostas,
    created_at: agora(),
  })

  return {
    usuarios: [{ id: professorId, email: CREDENCIAIS_DEMO.email, senha: CREDENCIAIS_DEMO.senha, nome: 'Clodoaldo Demo' }],
    avaliacoes: [
      {
        id: avaliacaoId,
        codigo: 'DEMOS',
        professor_id: professorId,
        nome_professor: 'Clodoaldo Demo',
        tipo_prova: 'Simulado Geral',
        nivel_ensino: 'Médio',
        turma: '3º Ano Ensino Médio',
        estrutura,
        status: 'ativa',
        created_at: agora(),
      },
    ],
    gabaritos: [{ avaliacao_id: avaliacaoId, respostas: gabarito }],
    entregas: [
      entrega('Ana Beatriz Lima', gabarito),
      entrega('Carlos Eduardo Silva', {
        Português: ['A', 'B', 'C', 'A', 'E'],
        Matemática: ['B', 'C', 'D', 'E', 'D'],
      }),
      entrega('Mariana Rocha', {
        Português: ['E', 'B', null, 'D', 'A'],
        Matemática: ['A', 'C', 'A', null, 'D'],
      }),
    ],
    feedbacks: [],
  }
}

function lerBanco(): Banco {
  try {
    const bruto = localStorage.getItem(CHAVE_BANCO)
    if (bruto) return JSON.parse(bruto) as Banco
  } catch {
    /* banco corrompido: recomeça */
  }
  const inicial = semear()
  salvarBanco(inicial)
  return inicial
}

function salvarBanco(banco: Banco) {
  localStorage.setItem(CHAVE_BANCO, JSON.stringify(banco))
}

const sessaoAtual = (): Usuario | null => {
  const id = localStorage.getItem(CHAVE_SESSAO)
  return lerBanco().usuarios.find((u) => u.id === id) ?? null
}

const comoUser = (u: Usuario) => ({ id: u.id, email: u.email, user_metadata: { full_name: u.nome } })
const comoSessao = (u: Usuario | null) => (u ? { user: comoUser(u), access_token: 'mock' } : null)

const erro = (message: string): Resultado => ({ data: null, error: { message } })
const ok = (data: unknown): Resultado => ({ data, error: null })

// ------------------------------------------------------------ tempo real entre abas

const radio = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('corrigeai-mock')

// ------------------------------------------------------------------------ regras

function respostasValidas(estrutura: Record<string, number>, respostas: unknown, permitirBranco: boolean): boolean {
  if (typeof respostas !== 'object' || respostas === null) return false
  const mapa = respostas as Record<string, unknown>
  if (Object.keys(mapa).length !== Object.keys(estrutura).length) return false
  return Object.entries(estrutura).every(([disciplina, qtd]) => {
    const lista = mapa[disciplina]
    return (
      Array.isArray(lista) &&
      lista.length === qtd &&
      lista.every((r) => (r === null ? permitirBranco : typeof r === 'string' && ALTERNATIVAS.includes(r)))
    )
  })
}

function gerarCodigo(banco: Banco): string {
  for (;;) {
    const codigo = Array.from({ length: 5 }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join('')
    if (!banco.avaliacoes.some((a) => a.codigo === codigo)) return codigo
  }
}

function rpc(nome: string, args: Record<string, unknown>): Resultado {
  const banco = lerBanco()

  if (nome === 'criar_avaliacao') {
    const usuario = sessaoAtual()
    if (!usuario) return erro('NAO_AUTENTICADO')
    const gabarito = args.p_gabarito as Record<string, string[]>
    const estrutura = Object.fromEntries(Object.entries(gabarito ?? {}).map(([d, l]) => [d, Array.isArray(l) ? l.length : 0]))
    const tamanhos = Object.values(estrutura)
    if (tamanhos.length === 0 || tamanhos.length > 12 || tamanhos.some((q) => q < 1 || q > 20) || !respostasValidas(estrutura, gabarito, false)) {
      return erro('GABARITO_INVALIDO')
    }
    const id = novoId()
    const codigo = gerarCodigo(banco)
    banco.avaliacoes.unshift({
      id,
      codigo,
      professor_id: usuario.id,
      nome_professor: String(args.p_nome_professor).trim(),
      tipo_prova: args.p_tipo_prova,
      nivel_ensino: args.p_nivel_ensino,
      turma: String(args.p_turma).trim(),
      estrutura,
      status: 'ativa',
      created_at: agora(),
    })
    banco.gabaritos.push({ avaliacao_id: id, respostas: gabarito })
    salvarBanco(banco)
    return ok(codigo)
  }

  const codigo = String(args.p_codigo ?? '').trim().toUpperCase()
  const prova = banco.avaliacoes.find((a) => a.codigo === codigo)

  if (nome === 'buscar_avaliacao_aluno') {
    if (!prova || prova.status !== 'ativa') return ok([])
    const { codigo: c, tipo_prova, nivel_ensino, turma, nome_professor, estrutura } = prova
    return ok([{ codigo: c, tipo_prova, nivel_ensino, turma, nome_professor, estrutura }])
  }

  if (nome === 'enviar_entrega') {
    if (!prova || prova.status !== 'ativa') return erro('AVALIACAO_INDISPONIVEL')
    const aluno = String(args.p_nome ?? '').trim()
    if (aluno.length < 2 || aluno.length > 120) return erro('NOME_INVALIDO')
    if (!respostasValidas(prova.estrutura as Record<string, number>, args.p_respostas, true)) return erro('RESPOSTAS_INVALIDAS')
    if (banco.entregas.some((e) => e.avaliacao_id === prova.id && e.nome_normalizado === aluno.toLowerCase())) {
      return erro('ENTREGA_DUPLICADA')
    }
    const nova = {
      id: novoId(),
      avaliacao_id: prova.id,
      nome_aluno: aluno,
      nome_normalizado: aluno.toLowerCase(),
      respostas: args.p_respostas,
      created_at: agora(),
    }
    banco.entregas.push(nova)
    salvarBanco(banco)
    radio?.postMessage({ tabela: 'entregas', evento: 'INSERT', novo: nova })
    return ok(null)
  }

  return erro(`Função desconhecida: ${nome}`)
}

// --------------------------------------------------------------- query builder

type Operacao = 'select' | 'insert' | 'update' | 'delete'

class Consulta implements PromiseLike<Resultado> {
  private operacao: Operacao = 'select'
  private filtros: [string, unknown][] = []
  private ordem: { coluna: string; asc: boolean } | null = null
  private dados: Linha = {}
  private colunas = '*'
  private unico: 'single' | 'maybe' | null = null

  constructor(private readonly tabela: Tabela) {}

  select(colunas = '*') {
    this.colunas = colunas
    return this
  }
  insert(dados: Linha) {
    this.operacao = 'insert'
    this.dados = dados
    return this
  }
  update(dados: Linha) {
    this.operacao = 'update'
    this.dados = dados
    return this
  }
  delete() {
    this.operacao = 'delete'
    return this
  }
  eq(coluna: string, valor: unknown) {
    this.filtros.push([coluna, valor])
    return this
  }
  order(coluna: string, opcoes: { ascending?: boolean } = {}) {
    this.ordem = { coluna, asc: opcoes.ascending ?? true }
    return this
  }
  returns() {
    return this
  }
  single() {
    this.unico = 'single'
    return this
  }
  maybeSingle() {
    this.unico = 'maybe'
    return this
  }

  then<R1 = Resultado, R2 = never>(
    aoResolver?: ((v: Resultado) => R1 | PromiseLike<R1>) | null,
    aoRejeitar?: ((e: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return new Promise<Resultado>((resolver) => window.setTimeout(() => resolver(this.executar()), 120)).then(
      aoResolver,
      aoRejeitar,
    )
  }

  /** Equivalente à RLS: o professor só enxerga o que é dele. */
  private visivel(banco: Banco, linha: Linha, uid: string | undefined): boolean {
    if (!uid) return false
    if (this.tabela === 'avaliacoes') return linha.professor_id === uid
    if (this.tabela === 'feedbacks') return linha.user_id === uid
    return banco.avaliacoes.some((a) => a.id === linha.avaliacao_id && a.professor_id === uid)
  }

  private executar(): Resultado {
    const banco = lerBanco()
    const uid = sessaoAtual()?.id
    const linhas = banco[this.tabela]

    if (this.operacao === 'insert') {
      if (this.tabela !== 'feedbacks' || !uid) return erro('permission denied')
      linhas.push({ id: novoId(), user_id: uid, created_at: agora(), ...this.dados })
      salvarBanco(banco)
      return ok(null)
    }

    let alvo = linhas.filter(
      (l) => this.visivel(banco, l, uid) && this.filtros.every(([c, v]) => l[c] === v),
    )

    if (this.operacao === 'update') {
      alvo.forEach((l) => Object.assign(l, this.dados))
      salvarBanco(banco)
    } else if (this.operacao === 'delete') {
      const ids = new Set(alvo.map((l) => l.id))
      banco[this.tabela] = linhas.filter((l) => !ids.has(l.id))
      if (this.tabela === 'avaliacoes') {
        banco.gabaritos = banco.gabaritos.filter((g) => !ids.has(g.avaliacao_id))
        banco.entregas = banco.entregas.filter((e) => !ids.has(e.avaliacao_id))
      }
      salvarBanco(banco)
    }

    if (this.ordem) {
      const { coluna, asc } = this.ordem
      alvo = [...alvo].sort((a, b) => String(a[coluna]).localeCompare(String(b[coluna])) * (asc ? 1 : -1))
    }

    let saida: Linha[] = alvo
    if (this.colunas.includes('entregas(count)')) {
      saida = alvo.map((l) => ({
        ...l,
        entregas: [{ count: banco.entregas.filter((e) => e.avaliacao_id === l.id).length }],
      }))
    } else if (this.colunas !== '*' && !this.colunas.includes('(')) {
      const campos = this.colunas.split(',').map((c) => c.trim())
      saida = alvo.map((l) => Object.fromEntries(campos.map((c) => [c, l[c]])))
    }

    if (this.unico) {
      if (saida.length === 0 && this.unico === 'single') return erro('JSON object requested, multiple (or no) rows returned')
      return ok(saida[0] ?? null)
    }
    return ok(saida)
  }
}

// ------------------------------------------------------------------------- auth

type OuvinteAuth = (evento: string, sessao: ReturnType<typeof comoSessao>) => void
const ouvintes = new Set<OuvinteAuth>()
const notificar = (evento: string) => ouvintes.forEach((o) => o(evento, comoSessao(sessaoAtual())))

const auth = {
  getSession: async () => ({ data: { session: comoSessao(sessaoAtual()) }, error: null }),

  onAuthStateChange(ouvinte: OuvinteAuth) {
    ouvintes.add(ouvinte)
    return { data: { subscription: { unsubscribe: () => ouvintes.delete(ouvinte) } } }
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const usuario = lerBanco().usuarios.find((u) => u.email === email.toLowerCase() && u.senha === password)
    if (!usuario) return { data: null, error: { message: 'Invalid login credentials' } }
    localStorage.setItem(CHAVE_SESSAO, usuario.id)
    notificar('SIGNED_IN')
    return { data: { session: comoSessao(usuario) }, error: null }
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: { full_name?: string } } }) {
    const banco = lerBanco()
    if (banco.usuarios.some((u) => u.email === email.toLowerCase())) {
      return { data: null, error: { message: 'User already registered' } }
    }
    const usuario = { id: novoId(), email: email.toLowerCase(), senha: password, nome: options?.data?.full_name || email.split('@')[0] || '' }
    banco.usuarios.push(usuario)
    salvarBanco(banco)
    localStorage.setItem(CHAVE_SESSAO, usuario.id)
    notificar('SIGNED_IN')
    return { data: { session: comoSessao(usuario), user: comoUser(usuario) }, error: null }
  },

  async signInWithOAuth() {
    const usuario = lerBanco().usuarios[0]
    if (!usuario) return { data: null, error: { message: 'sem usuário' } }
    localStorage.setItem(CHAVE_SESSAO, usuario.id)
    notificar('SIGNED_IN')
    return { data: {}, error: null }
  },

  async signOut() {
    localStorage.removeItem(CHAVE_SESSAO)
    notificar('SIGNED_OUT')
    return { error: null }
  },

  resetPasswordForEmail: async () => ({ data: {}, error: null }),

  async updateUser({ password }: { password: string }) {
    const banco = lerBanco()
    const usuario = banco.usuarios.find((u) => u.id === sessaoAtual()?.id)
    if (!usuario) return { data: null, error: { message: 'NAO_AUTENTICADO' } }
    usuario.senha = password
    salvarBanco(banco)
    return { data: { user: comoUser(usuario) }, error: null }
  },
}

// --------------------------------------------------------------------- realtime

interface CanalMock {
  on: (tipo: string, filtro: { filter?: string }, aoReceber: (p: { new: Linha }) => void) => CanalMock
  subscribe: () => CanalMock
  fechar: () => void
}

function criarCanal(): CanalMock {
  const registros: { filtro?: string; callback: (p: { new: Linha }) => void }[] = []
  const aoMensagem = (e: MessageEvent<{ tabela: string; novo: Linha }>) => {
    for (const { filtro, callback } of registros) {
      const [coluna, valor] = (filtro ?? '').split('=eq.')
      if (e.data.tabela === 'entregas' && (!coluna || e.data.novo[coluna] === valor)) callback({ new: e.data.novo })
    }
  }
  const canal: CanalMock = {
    on: (_tipo, { filter }, callback) => {
      registros.push({ filtro: filter, callback })
      return canal
    },
    subscribe: () => {
      radio?.addEventListener('message', aoMensagem)
      return canal
    },
    fechar: () => radio?.removeEventListener('message', aoMensagem),
  }
  return canal
}

// ------------------------------------------------------------------ cliente final

export function criarClienteMock(): SupabaseClient {
  lerBanco() // garante a semente já no primeiro carregamento
  const cliente = {
    auth,
    from: (tabela: Tabela) => new Consulta(tabela),
    rpc: (nome: string, args: Record<string, unknown>) =>
      new Promise<Resultado>((resolver) => window.setTimeout(() => resolver(rpc(nome, args)), 120)),
    channel: () => criarCanal(),
    removeChannel: async (canal: CanalMock) => canal.fechar(),
  }
  return cliente as unknown as SupabaseClient
}
