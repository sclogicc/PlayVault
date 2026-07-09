import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@shared/types'

export function useSessions(gameId: number | null) {
  return useQuery<Session[]>({
    queryKey: ['sessions', gameId],
    queryFn: () => window.api.session.getByGameId(gameId!),
    enabled: gameId !== null && gameId > 0,
  })
}

export function useSessionMutations() {
  const qc = useQueryClient()

  const invalidate = (gameId?: number) => {
    if (gameId) {
      qc.invalidateQueries({ queryKey: ['sessions', gameId] })
    } else {
      qc.invalidateQueries({ queryKey: ['sessions'] })
    }
  }

  const deleteSession = useMutation({
    mutationFn: ({ id }: { id: number; gameId: number }) =>
      window.api.session.delete(id),
    onSuccess: (_data, variables) => {
      invalidate(variables.gameId)
      qc.invalidateQueries({ queryKey: ['games'] })
    },
  })

  const endManually = useMutation({
    mutationFn: ({ id }: { id: number; gameId: number }) =>
      window.api.session.endManually(id),
    onSuccess: (_data, variables) => {
      invalidate(variables.gameId)
      qc.invalidateQueries({ queryKey: ['games'] })
    },
  })

  return { deleteSession, endManually }
}
