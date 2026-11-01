import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/contexts/AuthContext'
import { Carregando } from '@/components/ui/feedback'

/** Protege as rotas do professor. A segurança real está na RLS; isto só evita telas vazias. */
export function RequireAuth() {
  const { user, carregando } = useAuth()
  const local = useLocation()

  if (carregando) return <Carregando texto="Verificando sua sessão…" />
  if (!user) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />
  return <Outlet />
}
