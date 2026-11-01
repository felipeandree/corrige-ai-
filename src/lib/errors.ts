/** Mensagens amigáveis para os códigos de erro levantados pelas funções do banco. */
const MENSAGENS: Record<string, string> = {
  AVALIACAO_INDISPONIVEL: 'Não há prova aberta com esse código. Confira as 5 letras ou fale com o professor.',
  ENTREGA_DUPLICADA: 'Já recebemos uma entrega com esse nome. Se foi você, ela já está com o professor. Se não, use seu nome completo.',
  NOME_INVALIDO: 'Digite seu nome completo (de 2 a 120 caracteres).',
  RESPOSTAS_INVALIDAS: 'Seu cartão-resposta não é válido. Recarregue a página e tente de novo.',
  GABARITO_INVALIDO: 'O gabarito está incompleto ou fora dos limites permitidos.',
  NAO_AUTENTICADO: 'Sua sessão expirou. Entre novamente.',
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'User already registered': 'Este e-mail já tem cadastro. Entre com sua senha.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar. Enviamos um link para você.',
}

export class AppError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AppError'
  }
}

export function traduzirErro(erro: unknown): string {
  // Já traduzido pela camada de serviços: não passa por outra tradução.
  if (erro instanceof AppError) return erro.message
  const bruto = erro instanceof Error ? erro.message : typeof erro === 'object' && erro && 'message' in erro ? String(erro.message) : ''
  for (const [codigo, mensagem] of Object.entries(MENSAGENS)) {
    if (bruto.includes(codigo)) return mensagem
  }
  if (/failed to fetch|networkerror/i.test(bruto)) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'
  }
  return 'Algo deu errado. Tente novamente em instantes.'
}
