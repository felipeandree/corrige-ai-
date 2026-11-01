import type { RelatorioTurma } from './grading'

/**
 * Neutraliza "CSV injection": células que começam com = + - @ viram fórmula no Excel.
 * Também escapa aspas e envolve em aspas quando necessário.
 */
export function escaparCelula(valor: string | number): string {
  let texto = String(valor)
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/** CSV com separador ";" (padrão do Excel em pt-BR). */
export function relatorioParaCsv(relatorio: RelatorioTurma, disciplinas: string[]): string {
  const cabecalho = ['Aluno', ...disciplinas.map((d) => `${d} (%)`), 'Acertos', 'Total de questões', 'Aproveitamento geral (%)']
  const linhas = relatorio.alunos.map((aluno) => [
    aluno.nomeAluno,
    ...disciplinas.map((d) => Math.round(aluno.disciplinas[d]?.percentual ?? 0)),
    aluno.acertos,
    aluno.total,
    Math.round(aluno.percentual),
  ])
  return [cabecalho, ...linhas].map((linha) => linha.map(escaparCelula).join(';')).join('\r\n')
}

export function baixarCsv(nomeArquivo: string, conteudo: string): void {
  // BOM para o Excel reconhecer UTF-8.
  const blob = new Blob(['﻿', conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
