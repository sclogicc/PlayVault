export type UpdateStage =
  | 'idle'
  | 'checking'
  | 'available'
  | 'up_to_date'
  | 'blocked'
  | 'pulling'
  | 'installing'
  | 'building'
  | 'restarting'
  | 'error'
  | 'unsupported'

export interface UpdateStatus {
  stage: UpdateStage
  message: string
  currentRevision?: string
  remoteRevision?: string
  repositoryPath?: string
  updatedAt: number
}

export function createUpdateStatus(
  stage: UpdateStage,
  message: string,
  details: Omit<UpdateStatus, 'stage' | 'message' | 'updatedAt'> = {},
): UpdateStatus {
  return {
    stage,
    message,
    updatedAt: Date.now(),
    ...details,
  }
}
