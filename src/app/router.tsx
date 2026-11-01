import { createBrowserRouter, Navigate } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { Carregando } from '@/components/ui/feedback'

/** Cada página vira um chunk separado: o aluno não baixa o código do painel do professor. */
const pagina = (carregar: () => Promise<{ default: React.ComponentType }>) => async () => ({
  Component: (await carregar()).default,
  HydrateFallback: Carregando,
})

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    HydrateFallback: Carregando,
    children: [
      { index: true, lazy: pagina(() => import('@/pages/Home')) },
      { path: 'entrar', lazy: pagina(() => import('@/pages/Entrar')) },
      { path: 'redefinir-senha', lazy: pagina(() => import('@/pages/RedefinirSenha')) },
      { path: 'aluno', lazy: pagina(() => import('@/pages/AlunoCodigo')) },
      { path: 'aluno/:codigo', lazy: pagina(() => import('@/pages/AlunoProva')) },
      {
        path: 'professor',
        element: <RequireAuth />,
        children: [
          { index: true, lazy: pagina(() => import('@/pages/professor/Painel')) },
          { path: 'provas', lazy: pagina(() => import('@/pages/professor/Provas')) },
          { path: 'provas/nova', lazy: pagina(() => import('@/pages/professor/NovaProva')) },
          { path: 'provas/:id', lazy: pagina(() => import('@/pages/professor/ProvaDetalhe')) },
          { path: 'feedback', lazy: pagina(() => import('@/pages/professor/Feedback')) },
        ],
      },
      { path: 'painel', element: <Navigate to="/professor" replace /> },
      { path: '*', lazy: pagina(() => import('@/pages/NaoEncontrada')) },
    ],
  },
])
