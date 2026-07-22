import type { IpcMain } from 'electron'
import type { Database } from '../db/sqljs-wrapper'
import * as sessionRepo from '../db/repositories/sessionRepository'
import { manuallyEndTrackedSession } from '../services/processMonitor'
import { IPC_CHANNELS } from '../../shared/ipc'
import type { SessionEndReason } from '../../shared/constants'

export function registerSessionHandlers(ipcMain: IpcMain, db: Database): void {
  ipcMain.handle(
    IPC_CHANNELS.SESSION_GET_BY_GAME,
    (_event, gameId: number) => {
      return sessionRepo.getByGameId(db, gameId)
    },
  )

  ipcMain.handle(IPC_CHANNELS.SESSION_GET_BY_ID, (_event, id: number) => {
    return sessionRepo.getById(db, id)
  })

  ipcMain.handle(
    IPC_CHANNELS.SESSION_GET_BY_DATE,
    (_event, startDate: string, endDate: string) => {
      return sessionRepo.getByDateRange(db, startDate, endDate)
    },
  )

  ipcMain.handle(IPC_CHANNELS.SESSION_DELETE, (_event, id: number) => {
    sessionRepo.deleteSession(db, id)
  })

  ipcMain.handle(IPC_CHANNELS.SESSION_END_MANUALLY, (_event, id: number) => {
    manuallyEndTrackedSession(db, id)
  })

  ipcMain.handle(
    IPC_CHANNELS.SESSION_UPDATE_TIME,
    (
      _event,
      id: number,
      data: {
        started_at?: string
        ended_at?: string
        duration_seconds?: number
        end_reason?: SessionEndReason
        notes?: string
      },
    ) => {
      sessionRepo.updateSession(db, id, data)
    },
  )

  ipcMain.handle(IPC_CHANNELS.SESSION_GET_ALL_ACTIVE, () => {
    return sessionRepo.getAllActiveSessions(db)
  })

  ipcMain.handle(IPC_CHANNELS.SESSION_RECOVER, () => {
    return sessionRepo.recoverOrphanedSessions(db)
  })
}
