// ========== IPC Channel Constants ==========

export const IPC_CHANNELS = {
  // Game CRUD
  GAME_GET_ALL: 'game:getAll',
  GAME_GET_BY_ID: 'game:getById',
  GAME_CREATE: 'game:create',
  GAME_UPDATE: 'game:update',
  GAME_DELETE: 'game:delete',
  GAME_TOGGLE: 'game:toggleEnabled',
  GAME_GET_ARCHIVED: 'game:getArchived',
  GAME_ARCHIVE: 'game:archive',

  // Game actions
  GAME_LAUNCH: 'game:launch',
  GAME_CHECK_INSTALL: 'game:checkInstall',
  GAME_COMPLETE: 'game:complete',

  // GameExecutable
  EXE_ADD: 'exe:add',
  EXE_REMOVE: 'exe:remove',
  EXE_GET_BY_GAME: 'exe:getByGame',
  EXE_UPDATE: 'exe:update',

  // Session
  SESSION_GET_BY_GAME: 'session:getByGame',
  SESSION_DELETE: 'session:delete',
  SESSION_GET_BY_DATE: 'session:getByDate',

  // Screenshot
  SCREENSHOT_GET_ALL: 'screenshot:getAll',
  SCREENSHOT_GET_BY_STATUS: 'screenshot:getByStatus',
  SCREENSHOT_GET_BY_GAME: 'screenshot:getByGame',
  SCREENSHOT_UPDATE_STATUS: 'screenshot:updateStatus',
  SCREENSHOT_BATCH_UPDATE: 'screenshot:batchUpdate',
  SCREENSHOT_GET_PENDING_COUNT: 'screenshot:getPendingCount',
  SCREENSHOT_REMATCH: 'screenshot:rematch',
  SCREENSHOT_TRASH: 'screenshot:trash',
  SCREENSHOT_RESTORE: 'screenshot:restore',
  SCREENSHOT_PERMANENT_DELETE: 'screenshot:permanentDelete',
  SCREENSHOT_BATCH_PERMANENT_DELETE: 'screenshot:batchPermanentDelete',

  // AppSetting
  SETTING_GET: 'setting:get',
  SETTING_SET: 'setting:set',
  SETTING_GET_ALL: 'setting:getAll',

  // ScanRoot
  SCAN_ROOT_GET_ALL: 'scanRoot:getAll',
  SCAN_ROOT_CREATE: 'scanRoot:create',
  SCAN_ROOT_UPDATE: 'scanRoot:update',
  SCAN_ROOT_DELETE: 'scanRoot:delete',
  SCAN_ROOT_TOGGLE: 'scanRoot:toggleEnabled',

  // DiscoveredExecutable
  DISCOVERED_GET_ALL: 'discovered:getAll',
  DISCOVERED_GET_BY_STATUS: 'discovered:getByStatus',
  DISCOVERED_UPDATE_STATUS: 'discovered:updateStatus',
  DISCOVERED_BATCH_UPDATE: 'discovered:batchUpdate',

  // Scanner
  SCANNER_TRIGGER: 'scanner:trigger',

  // Session Management
  SESSION_END_MANUALLY: 'session:endManually',
  SESSION_UPDATE_TIME: 'session:updateTime',
  SESSION_GET_BY_ID: 'session:getById',
  SESSION_GET_ALL_ACTIVE: 'session:getAllActive',
  SESSION_RECOVER: 'session:recover',

  // Vault archive storage
  VAULT_GET_LOCATION: 'vault:getLocation',
  VAULT_RELOCATE: 'vault:relocate',
  VAULT_GET_HEALTH: 'vault:getHealth',

  // Source update
  UPDATE_GET_STATUS: 'update:getStatus',
  UPDATE_CHECK: 'update:check',
  UPDATE_TRIGGER: 'update:trigger',
  UPDATE_STATUS_CHANGED: 'update:statusChanged',

  // File operations
  FILE_OPEN_LOCATION: 'file:openLocation',
  DIALOG_OPEN_EXECUTABLE: 'dialog:openExecutable',
  DIALOG_OPEN_IMAGE: 'dialog:openImage',
} as const
