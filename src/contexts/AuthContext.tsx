import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { AppError, traduzirErro } from '@/lib/errors'

interface AuthContextValue {
  user: User | null
  /** true enquanto a sessão salva ainda está sendo restaurada. */
  carregando: boolean
  nomeExibicao: string
  entrarComGoogle: () => Promise<void>
  entrarComEmail: (email: string, senha: string) => Promise<void>
  /** Devolve true quando o cadastro exige confirmação por e-mail. */
  cadastrarComEmail: (nome: string, email: string, senha: string) => Promise<boolean>
  sair: () => Promise<void>
  /** Envia o e-mail de redefinição de senha. */
  recuperarSenha: (email: string) => Promise<void>
  /** Define a nova senha na sessão de recuperação. */
  definirNovaSenha: (senha: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const nomeDoUsuario = (user: User | null) =>
  (user?.user_metadata?.full_name as string | undefined) ??
  (user?.user_metadata?.name as string | undefined) ??
  user?.email?.split('@')[0] ??
  ''

const comoErro = (erro: unknown) => new AppError(traduzirErro(erro), { cause: erro })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    let ativo = true
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      setSession(data.session)
      setCarregando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      // Cache é por navegador, não por usuário: sem isto, o próximo professor veria os dados do anterior.
      if (evento === 'SIGNED_OUT') queryClient.clear()
      setSession(novaSessao)
      setCarregando(false)
    })
    return () => {
      ativo = false
      data.subscription.unsubscribe()
    }
  }, [queryClient])

  const entrarComGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/professor` },
    })
    if (error) throw comoErro(error)
  }, [])

  const entrarComEmail = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw comoErro(error)
  }, [])

  const cadastrarComEmail = useCallback(async (nome: string, email: string, senha: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { full_name: nome },
        emailRedirectTo: `${window.location.origin}/professor`,
      },
    })
    if (error) throw comoErro(error)
    return data.session === null
  }, [])

  const sair = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw comoErro(error)
  }, [])

  const recuperarSenha = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    if (error) throw comoErro(error)
  }, [])

  const definirNovaSenha = useCallback(async (senha: string) => {
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) throw comoErro(error)
  }, [])

  const user = session?.user ?? null
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      carregando,
      nomeExibicao: nomeDoUsuario(user),
      entrarComGoogle,
      entrarComEmail,
      cadastrarComEmail,
      sair,
      recuperarSenha,
      definirNovaSenha,
    }),
    [user, carregando, entrarComGoogle, entrarComEmail, cadastrarComEmail, sair, recuperarSenha, definirNovaSenha],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
