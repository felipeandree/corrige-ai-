import { createClient } from '@supabase/supabase-js'
import { criarClienteMock } from './mock/clienteMock'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** `npm run dev:mock`: backend falso no navegador, sem Supabase. Eliminado do build de produção. */
export const modoMock = import.meta.env.VITE_MOCK === 'true'

export const supabaseConfigurado = modoMock || Boolean(url && anonKey)

/**
 * Quando as variáveis não estão definidas o cliente usa valores inertes e a
 * interface mostra a tela de configuração (ver ConfigGate), sem derrubar a app.
 */
export const supabase = modoMock
  ? criarClienteMock()
  : createClient(url ?? 'http://localhost:54321', anonKey ?? 'sem-configuracao', {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
