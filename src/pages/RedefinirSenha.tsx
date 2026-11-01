import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { traduzirErro } from '@/lib/errors'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { Carregando } from '@/components/ui/feedback'

const SENHA_MINIMA = 8

/** Destino do link enviado por e-mail: o Supabase abre uma sessão de recuperação antes de chegar aqui. */
export default function RedefinirSenha() {
  const { user, carregando, definirNovaSenha } = useAuth()
  const { mostrar } = useToast()
  const navegar = useNavigate()
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  if (carregando) return <Carregando />

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-4">
        <h1 className="text-3xl font-bold">Link inválido ou expirado</h1>
        <p className="mt-3 text-tinta/80">Peça um novo link na tela de login, em “Esqueci minha senha”.</p>
        <Link to="/entrar" className="mt-6 inline-block font-semibold underline underline-offset-4">
          Ir para o login
        </Link>
      </div>
    )
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    if (senha.length < SENHA_MINIMA) return setErro(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`)
    if (senha !== confirmacao) return setErro('As senhas não são iguais.')

    setErro(undefined)
    setEnviando(true)
    try {
      await definirNovaSenha(senha)
      mostrar('Senha alterada.', 'sucesso')
      navegar('/professor', { replace: true })
    } catch (e) {
      setErro(traduzirErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="mx-auto max-w-md py-4">
      <h1 className="text-3xl font-bold">Crie uma nova senha</h1>
      <form onSubmit={aoEnviar} className="mt-6 space-y-4">
        <TextField
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          dica={`Mínimo de ${SENHA_MINIMA} caracteres.`}
        />
        <TextField
          label="Repita a nova senha"
          type="password"
          autoComplete="new-password"
          required
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          erro={erro}
        />
        <Button type="submit" carregando={enviando} className="w-full py-3">
          Salvar nova senha
        </Button>
      </form>
    </div>
  )
}
