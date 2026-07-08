import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc'

const api = {
  game: {
    getAll: (filters?: { search?: string; status?: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.GAME_GET_ALL, filters),
    getById: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.GAME_GET_BY_ID, id),
    create: (data: {
      name: string
      display_name?: string
      aliases?: string
      status?: string
      platform?: string
      tags?: string
      screenshot_folder_name?: string
      notes?: string
    }) => ipcRenderer.invoke(IPC_CHANNELS.GAME_CREATE, data),
    update: (
      id: number,
      data: {
        name?: string
        display_name?: string
        aliases?: string
        status?: string
        platform?: string
        tags?: string
        screenshot_folder_name?: string
        notes?: string
      },
    ) => ipcRenderer.invoke(IPC_CHANNELS.GAME_UPDATE, id, data),
    delete: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.GAME_DELETE, id),
    toggleEnabled: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.GAME_TOGGLE, id),
  },
  executable: {
    getByGameId: (gameId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXE_GET_BY_GAME, gameId),
    add: (data: { game_id: number; exe_name: string; install_path_hint?: string }) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXE_ADD, data),
    remove: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.EXE_REMOVE, id),
  },
}

contextBridge.exposeInMainWorld('api', api)
