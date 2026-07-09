import type { IpcMain } from 'electron'
import { dialog } from 'electron'
import type { Database } from '../db/sqljs-wrapper'
import * as scanRootRepo from '../db/repositories/scanRootRepository'
import * as discoveredRepo from '../db/repositories/discoveredExeRepository'
import * as gameRepo from '../db/repositories/gameRepository'
import * as exeRepo from '../db/repositories/executableRepository'
import { scanDirectory } from '../services/scanner'
import { scoreCandidates } from '../services/scorer'
import { IPC_CHANNELS } from '../../shared/ipc'
import type { DiscoveredStatus } from '../../shared/constants'

export function registerScanHandlers(ipcMain: IpcMain, db: Database): void {
  // ========== ScanRoot CRUD ==========

  ipcMain.handle(IPC_CHANNELS.SCAN_ROOT_GET_ALL, () => {
    return scanRootRepo.getAll(db)
  })

  ipcMain.handle(IPC_CHANNELS.SCAN_ROOT_CREATE, (_event, data: { path: string }) => {
    return scanRootRepo.create(db, data)
  })

  ipcMain.handle(
    IPC_CHANNELS.SCAN_ROOT_UPDATE,
    (_event, id: number, data: { path?: string; is_enabled?: number }) => {
      scanRootRepo.update(db, id, data)
    },
  )

  ipcMain.handle(IPC_CHANNELS.SCAN_ROOT_DELETE, (_event, id: number) => {
    scanRootRepo.remove(db, id)
  })

  ipcMain.handle(IPC_CHANNELS.SCAN_ROOT_TOGGLE, (_event, id: number) => {
    scanRootRepo.toggleEnabled(db, id)
  })

  // ========== Discovered Executables ==========

  ipcMain.handle(
    IPC_CHANNELS.DISCOVERED_GET_ALL,
    (_event, status?: DiscoveredStatus) => {
      if (status) {
        return discoveredRepo.getByStatus(db, status)
      }
      return discoveredRepo.getAll(db)
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.DISCOVERED_UPDATE_STATUS,
    (
      _event,
      id: number,
      status: DiscoveredStatus,
      linkedGameId?: number,
    ) => {
      discoveredRepo.updateStatus(db, id, status, linkedGameId)
    },
  )

  ipcMain.handle(
    IPC_CHANNELS.DISCOVERED_BATCH_UPDATE,
    (
      _event,
      updates: Array<{ id: number; status: DiscoveredStatus; linkedGameId?: number }>,
    ) => {
      for (const u of updates) {
        discoveredRepo.updateStatus(db, u.id, u.status, u.linkedGameId)
      }
    },
  )

  // ========== Scanner Trigger ==========

  ipcMain.handle(IPC_CHANNELS.SCANNER_TRIGGER, async () => {
    const roots = scanRootRepo.getEnabled(db)
    let totalFound = 0

    for (const root of roots) {
      const scanned = scanDirectory(root.path, 3)
      const scored = scoreCandidates(scanned)

      // Batch upsert into discovered_executables
      discoveredRepo.batchUpsert(
        db,
        scored.map((s) => ({
          scan_root_id: root.id,
          file_path: s.file_path,
          file_name: s.file_name,
          folder_name: s.folder_name,
          file_size: s.file_size,
          modified_at: s.modified_at,
          score: s.score,
          match_reasons: JSON.stringify(s.match_reasons),
        })),
      )

      // Update last_scanned_at
      scanRootRepo.updateLastScanned(db, root.id)
      totalFound += scanned.length
    }

    return { totalFound }
  })

  // ========== Candidate → Game Conversion ==========

  ipcMain.handle(
    'discover:accept',
    (
      _event,
      data: {
        candidateId: number
        displayName?: string
      },
    ) => {
      const candidate = discoveredRepo.getById(db, data.candidateId)
      if (!candidate) {
        throw new Error(`Candidate ${data.candidateId} not found`)
      }

      if (candidate.status !== 'pending') {
        throw new Error(`Candidate ${data.candidateId} already ${candidate.status}`)
      }

      // Derive game name
      const gameName =
        data.displayName ||
        candidate.folder_name ||
        candidate.file_name.replace(/\.exe$/i, '')

      // Create game
      const gameResult = gameRepo.createGame(db, {
        name: gameName,
        display_name: gameName,
        status: '未开始',
      })

      // Create executable binding
      exeRepo.add(db, {
        game_id: gameResult.lastInsertRowid,
        exe_name: candidate.file_name,
        install_path_hint: candidate.file_path,
      })

      // Mark candidate as accepted
      discoveredRepo.updateStatus(
        db,
        data.candidateId,
        'accepted',
        gameResult.lastInsertRowid,
      )

      return { gameId: gameResult.lastInsertRowid }
    },
  )

  // ========== Open Directory Dialog ==========

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择游戏扫描目录',
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })
}
