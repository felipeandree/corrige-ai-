import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  buscarAvaliacao,
  buscarGabarito,
  criarAvaliacao,
  encerrarAvaliacao,
  excluirAvaliacao,
  excluirEntrega,
  listarAvaliacoes,
  listarEntregas,
} from '@/services/avaliacoes'

export const chaves = {
  avaliacoes: ['avaliacoes'] as const,
  avaliacao: (id: string) => ['avaliacao', id] as const,
  gabarito: (id: string) => ['gabarito', id] as const,
  entregas: (id: string) => ['entregas', id] as const,
}

export const useAvaliacoes = () => useQuery({ queryKey: chaves.avaliacoes, queryFn: listarAvaliacoes })

export const useAvaliacao = (id: string) =>
  useQuery({ queryKey: chaves.avaliacao(id), queryFn: () => buscarAvaliacao(id) })

export const useGabarito = (id: string) =>
  useQuery({ queryKey: chaves.gabarito(id), queryFn: () => buscarGabarito(id), staleTime: Infinity })

/**
 * Entregas de uma avaliação, atualizadas ao vivo: cada INSERT recebido pelo
 * Supabase Realtime invalida a consulta. A RLS garante que só o dono recebe.
 */
export function useEntregas(avaliacaoId: string, aoReceberNova?: (nomeAluno: string) => void) {
  const queryClient = useQueryClient()
  const aoReceberRef = useRef(aoReceberNova)
  useEffect(() => {
    aoReceberRef.current = aoReceberNova
  })

  useEffect(() => {
    const canal = supabase
      .channel(`entregas-${avaliacaoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'entregas', filter: `avaliacao_id=eq.${avaliacaoId}` },
        (payload) => {
          void queryClient.invalidateQueries({ queryKey: chaves.entregas(avaliacaoId) })
          void queryClient.invalidateQueries({ queryKey: chaves.avaliacoes })
          aoReceberRef.current?.((payload.new as { nome_aluno: string }).nome_aluno)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(canal)
    }
  }, [avaliacaoId, queryClient])

  // O polling cobre falhas silenciosas do canal e eventos ocorridos antes do subscribe.
  return useQuery({
    queryKey: chaves.entregas(avaliacaoId),
    queryFn: () => listarEntregas(avaliacaoId),
    refetchInterval: 15_000,
  })
}

export function useCriarAvaliacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: criarAvaliacao,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chaves.avaliacoes }),
  })
}

export function useEncerrarAvaliacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: encerrarAvaliacao,
    onSuccess: (_dados, id) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: chaves.avaliacoes }),
        queryClient.invalidateQueries({ queryKey: chaves.avaliacao(id) }),
      ]),
  })
}

export function useExcluirAvaliacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: excluirAvaliacao,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chaves.avaliacoes }),
  })
}

export function useExcluirEntrega(avaliacaoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: excluirEntrega,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: chaves.entregas(avaliacaoId) }),
        queryClient.invalidateQueries({ queryKey: chaves.avaliacoes }),
      ]),
  })
}
