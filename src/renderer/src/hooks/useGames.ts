import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { GameWithStats } from '@shared/types'

export function useGames() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('全部')

  const { data: games = [], isLoading } = useQuery<GameWithStats[]>({
    queryKey: ['games', search, statusFilter],
    queryFn: () =>
      window.api.game.getAll({
        search: search || undefined,
        status: statusFilter !== '全部' ? statusFilter : undefined,
        includeHidden: true,
      }),
  })

  const filteredGames = useMemo(() => games, [games])

  return {
    games: filteredGames,
    isLoading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
  }
}

export function useGame(gameId: number | null) {
  return useQuery({
    queryKey: ['games', gameId],
    queryFn: () => window.api.game.getById(gameId!),
    enabled: gameId !== null && gameId > 0,
  })
}

export function useGameMutations() {
  const qc = useQueryClient()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['games'] })
  }

  const createGame = useMutation({
    mutationFn: (data: {
      name: string
      display_name?: string
      aliases?: string
      status?: string
      platform?: string
      tags?: string
      screenshot_folder_name?: string
      notes?: string
      cover_path?: string
      cover_crop?: string
      banner_crop?: string
      background_path?: string
      background_crop?: string
    }) => window.api.game.create(data),
    onSuccess: invalidate,
  })

  const updateGame = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: {
        name?: string
        display_name?: string
        aliases?: string
        status?: string
        platform?: string
        tags?: string
        screenshot_folder_name?: string
        notes?: string
        cover_path?: string
        cover_crop?: string
        banner_crop?: string
        background_path?: string
        background_crop?: string
        is_favorite?: number
        is_hidden?: number
      }
    }) => window.api.game.update(id, data),
    onSuccess: invalidate,
  })

  const deleteGame = useMutation({
    mutationFn: (id: number) => window.api.game.delete(id),
    onSuccess: invalidate,
  })

  const toggleGame = useMutation({
    mutationFn: (id: number) => window.api.game.toggleEnabled(id),
    onSuccess: invalidate,
  })

  return { createGame, updateGame, deleteGame, toggleGame }
}

export function useGameExecutables(gameId: number | null) {
  return useQuery({
    queryKey: ['executables', gameId],
    queryFn: () => window.api.executable.getByGameId(gameId!),
    enabled: gameId !== null && gameId > 0,
  })
}

export function useExecutableMutations() {
  const qc = useQueryClient()

  const addExe = useMutation({
    mutationFn: (data: {
      game_id: number
      exe_name: string
      install_path_hint?: string
    }) => window.api.executable.add(data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['executables', variables.game_id] })
      qc.invalidateQueries({ queryKey: ['games'] })
    },
  })

  const removeExe = useMutation({
    mutationFn: ({ id }: { id: number; gameId: number }) =>
      window.api.executable.remove(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['executables', variables.gameId] })
      qc.invalidateQueries({ queryKey: ['games'] })
    },
  })

  return { addExe, removeExe }
}
