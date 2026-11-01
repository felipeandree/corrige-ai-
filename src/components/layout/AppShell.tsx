import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { LogOut } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { modoMock } from '@/lib/supabase'
import { Logo } from './Logo'

const LINKS = [
  { to: '/professor', rotulo: 'Painel', fim: true },
  { to: '/professor/provas', rotulo: 'Provas', fim: false },
  { to: '/professor/feedback', rotulo: 'Enviar opinião', fim: false },
]

function tituloDaRota(caminho: string): string {
  const titulos: [RegExp, string][] = [
    [/^\/$/, 'CorrigeAÍ'],
    [/^\/entrar/, 'Entrar'],
    [/^\/redefinir-senha/, 'Nova senha'],
    [/^\/aluno\/.+/, 'Responder prova'],
    [/^\/aluno/, 'Código da prova'],
    [/^\/professor\/provas\/nova/, 'Criar prova'],
    [/^\/professor\/provas\/.+/, 'Detalhes da prova'],
    [/^\/professor\/provas/, 'Provas'],
    [/^\/professor\/feedback/, 'Enviar opinião'],
    [/^\/professor/, 'Painel'],
  ]
  const achado = titulos.find(([regra]) => regra.test(caminho))
  return achado ? `${achado[1]} · CorrigeAÍ` : 'CorrigeAÍ'
}

export function AppShell() {
  const { user, nomeExibicao, sair } = useAuth()
  const { mostrar } = useToast()
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const principal = useRef<HTMLElement>(null)

  // Leitores de tela só percebem a troca de página se o foco e o título acompanharem a rota.
  useEffect(() => {
    document.title = tituloDaRota(pathname)
    principal.current?.focus({ preventScroll: true })
  }, [pathname])

  async function aoSair() {
    try {
      await sair()
      navegar('/')
    } catch {
      mostrar('Não foi possível sair. Tente de novo.', 'erro')
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#conteudo"
        className="sr-only rounded-md bg-marca px-4 py-2 font-semibold focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Pular para o conteúdo
      </a>
      {modoMock && (
        <div className="bg-marca px-4 py-2 text-center text-sm font-medium text-tinta">
          Modo demonstração: os dados ficam só neste navegador. Professor de exemplo: professor@demo.com / demo1234. Código de exemplo para alunos: DEMOS.
        </div>
      )}
      <header className="border-b border-linha bg-folha">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Logo to={user ? '/professor' : '/'} />
            {user && (
              <nav aria-label="Principal" className="hidden items-center gap-1 sm:flex">
                {LINKS.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.fim}
                    className={({ isActive }) =>
                      clsx(
                        'rounded-md px-3 py-2 text-sm font-medium',
                        isActive ? 'bg-tinta text-white' : 'text-tinta/70 hover:bg-tinta/5 hover:text-tinta',
                      )
                    }
                  >
                    {link.rotulo}
                  </NavLink>
                ))}
              </nav>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-3">
              <span className="hidden max-w-40 truncate text-sm text-tinta/70 md:inline">{nomeExibicao}</span>
              <button
                type="button"
                onClick={aoSair}
                className="inline-flex items-center gap-1.5 rounded-md border border-linha px-3 py-2 text-sm font-medium hover:border-tinta"
              >
                <LogOut aria-hidden className="size-4" />
                Sair
              </button>
            </div>
          )}
        </div>
        {user && (
          <nav aria-label="Principal" className="flex gap-1 overflow-x-auto border-t border-linha px-4 py-2 sm:hidden">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.fim}
                className={({ isActive }) =>
                  clsx(
                    'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium',
                    isActive ? 'bg-tinta text-white' : 'text-tinta/70',
                  )
                }
              >
                {link.rotulo}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main id="conteudo" ref={principal} tabIndex={-1} className="outline-none mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-linha py-6 text-center text-xs text-tinta/70">
        CorrigeAÍ © {new Date().getFullYear()}
      </footer>
    </div>
  )
}
