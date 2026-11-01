import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { traduzirErro } from '@/lib/errors'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { Carregando } from '@/components/ui/feedback'

type Modo = 'entrar' | 'cadastrar'

const SENHA_MINIMA = 8

function IconeGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  )
}

export default function Entrar() {
  const { user, carregando, entrarComGoogle, entrarComEmail, cadastrarComEmail, recuperarSenha } = useAuth()
  const { mostrar } = useToast()
  const navegar = useNavigate()
  const local = useLocation()
  const destino = (local.state as { de?: string } | null)?.de ?? '/professor'

  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string>()
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false)
  const [recuperando, setRecuperando] = useState(false)
  const [recuperacaoEnviada, setRecuperacaoEnviada] = useState(false)

  if (carregando) return <Carregando />
  if (user) return <Navigate to={destino} replace />

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    setErro(undefined)

    if (modo === 'cadastrar' && senha.length < SENHA_MINIMA) {
      setErro(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`)
      return
    }

    setEnviando(true)
    try {
      if (modo === 'entrar') {
        await entrarComEmail(email.trim(), senha)
        navegar(destino, { replace: true })
      } else {
        const precisaConfirmar = await cadastrarComEmail(nome.trim(), email.trim(), senha)
        if (precisaConfirmar) setAguardandoConfirmacao(true)
        else navegar(destino, { replace: true })
      }
    } catch (e) {
      setErro(traduzirErro(e))
    } finally {
      setEnviando(false)
    }
  }

  async function aoEntrarComGoogle() {
    try {
      await entrarComGoogle()
    } catch (e) {
      mostrar(traduzirErro(e), 'erro')
    }
  }

  async function aoRecuperar(evento: FormEvent) {
    evento.preventDefault()
    setErro(undefined)
    setEnviando(true)
    try {
      await recuperarSenha(email.trim())
      setRecuperacaoEnviada(true)
    } catch (e) {
      setErro(traduzirErro(e))
    } finally {
      setEnviando(false)
    }
  }

  if (recuperando) {
    return (
      <div className="mx-auto max-w-md py-4">
        <h1 className="text-3xl font-bold">Recuperar senha</h1>
        {recuperacaoEnviada ? (
          <>
            <p className="mt-3 text-tinta/80">
              Se existir uma conta para <strong>{email}</strong>, enviamos um link para criar uma nova senha.
            </p>
            <Button variante="secundario" className="mt-6" onClick={() => { setRecuperando(false); setRecuperacaoEnviada(false) }}>
              Voltar para o login
            </Button>
          </>
        ) : (
          <form onSubmit={aoRecuperar} className="mt-6 space-y-4">
            <p className="text-tinta/70">Informe o e-mail da sua conta. Enviamos um link para criar uma nova senha.</p>
            <TextField label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} erro={erro} />
            <Button type="submit" carregando={enviando} className="w-full py-3">
              Enviar link
            </Button>
            <Button variante="texto" className="w-full" onClick={() => setRecuperando(false)}>
              Voltar
            </Button>
          </form>
        )}
      </div>
    )
  }

  if (aguardandoConfirmacao) {
    return (
      <div className="mx-auto max-w-md py-8">
        <h1 className="text-2xl font-bold">Confirme seu e-mail</h1>
        <p className="mt-3 text-tinta/80">
          Enviamos um link para <strong>{email}</strong>. Abra o e-mail, clique no link e volte para entrar.
        </p>
        <Button variante="secundario" className="mt-6" onClick={() => { setAguardandoConfirmacao(false); setModo('entrar') }}>
          Já confirmei, quero entrar
        </Button>
      </div>
    )
  }

  const cadastrando = modo === 'cadastrar'

  return (
    <div className="mx-auto max-w-md py-4">
      <h1 className="text-3xl font-bold">{cadastrando ? 'Crie sua conta de professor' : 'Entre na sua conta'}</h1>
      <p className="mt-2 text-tinta/70">Só professores precisam de conta. Alunos entram com o código da prova.</p>

      <Button variante="secundario" className="mt-6 w-full py-3" onClick={aoEntrarComGoogle}>
        <IconeGoogle />
        Continuar com Google
      </Button>

      <div className="my-6 flex items-center gap-3 text-sm text-tinta/70" role="separator">
        <span className="h-px flex-1 bg-linha" />
        ou use seu e-mail
        <span className="h-px flex-1 bg-linha" />
      </div>

      <form onSubmit={aoEnviar} className="space-y-4" noValidate={false}>
        {cadastrando && (
          <TextField
            label="Seu nome"
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        )}
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Senha"
          type="password"
          autoComplete={cadastrando ? 'new-password' : 'current-password'}
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          dica={cadastrando ? `Mínimo de ${SENHA_MINIMA} caracteres.` : undefined}
          erro={erro}
        />
        <Button type="submit" carregando={enviando} className="w-full py-3">
          {cadastrando ? 'Criar conta' : 'Entrar'}
        </Button>
        {!cadastrando && (
          <button type="button" className="block w-full text-center text-sm font-medium underline underline-offset-4" onClick={() => { setErro(undefined); setRecuperando(true) }}>
            Esqueci minha senha
          </button>
        )}
      </form>

      <p className="mt-6 text-center text-sm text-tinta/70">
        {cadastrando ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
        <button
          type="button"
          className="font-semibold text-tinta underline underline-offset-4"
          onClick={() => {
            setModo(cadastrando ? 'entrar' : 'cadastrar')
            setErro(undefined)
          }}
        >
          {cadastrando ? 'Entrar' : 'Criar conta'}
        </button>
      </p>
    </div>
  )
}
