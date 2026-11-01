import { supabase } from '@/lib/supabase'
import { AppError, traduzirErro } from '@/lib/errors'
import type { NovoFeedback } from '@/types/domain'

export async function enviarFeedback(feedback: NovoFeedback): Promise<void> {
  const { error } = await supabase.from('feedbacks').insert({
    tipo: feedback.tipo,
    tela: feedback.tela,
    titulo: feedback.titulo,
    descricao: feedback.descricao,
    gravidade: feedback.gravidade,
    docente_nome: feedback.docenteNome.slice(0, 120),
    docente_email: feedback.docenteEmail.slice(0, 200),
  })
  if (error) throw new AppError(traduzirErro(error), { cause: error })
}
