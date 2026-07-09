import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ScanRoot } from '@shared/types'

export function useScanRoots() {
  const { data: roots = [], isLoading } = useQuery<ScanRoot[]>({
    queryKey: ['scanRoots'],
    queryFn: () => window.api.scanRoot.getAll(),
  })

  return { roots, isLoading }
}

export function useScanRootMutations() {
  const qc = useQueryClient()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['scanRoots'] })
  }

  const create = useMutation({
    mutationFn: (data: { path: string }) => window.api.scanRoot.create(data),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { path?: string; is_enabled?: number } }) =>
      window.api.scanRoot.update(id, data),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: number) => window.api.scanRoot.delete(id),
    onSuccess: invalidate,
  })

  const toggle = useMutation({
    mutationFn: (id: number) => window.api.scanRoot.toggleEnabled(id),
    onSuccess: invalidate,
  })

  return { create, update, remove, toggle }
}

export function useTriggerScan() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => window.api.scanner.trigger(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scanRoots'] })
      qc.invalidateQueries({ queryKey: ['discovered'] })
    },
  })
}
