import type { ReactNode } from 'react'
import { supabaseConfigurado } from '@/lib/supabase'

/** Em vez de uma tela em branco, explica o que falta quando o .env não foi preenchido. */
export function ConfigGate({ children }: { children: ReactNode }) {
  if (supabaseConfigurado) return children

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-bold">Falta conectar o banco de dados</h1>
      <p className="mt-3 text-tinta/80">
        O CorrigeAÍ não encontrou as credenciais do Supabase. Crie um arquivo <code className="rounded bg-folha px-1.5 py-0.5">.env.local</code> na
        raiz do projeto com:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-md border border-linha bg-folha p-4 text-sm">
        {`VITE_SUPABASE_URL=https://seu-projeto.supabase.co\nVITE_SUPABASE_ANON_KEY=sua-chave-anon-publica`}
      </pre>
      <p className="mt-4 text-sm text-tinta/70">
        Depois, rode o SQL de <code>supabase/migrations</code> no seu projeto e reinicie o servidor de desenvolvimento.
      </p>
    </div>
  )
}
