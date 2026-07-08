// ========== IPC Channel Constants ==========

export const IPC_CHANNELS = {
  // Game CRUD
  GAME_GET_ALL: 'game:getAll',
  GAME_GET_BY_ID: 'game:getById',
  GAME_CREATE: 'game:create',
  GAME_UPDATE: 'game:update',
  GAME_DELETE: 'game:delete',
  GAME_TOGGLE: 'game:toggleEnabled',

  // GameExecutable
  EXE_ADD: 'exe:add',
  EXE_REMOVE: 'exe:remove',
  EXE_GET_BY_GAME: 'exe:getByGame',

  // Session
  SESSION_GET_BY_GAME: 'session:getByGame',
  SESSION_DELETE: 'session:delete',
  SESSION_GET_BY_DATE: 'session:getByDate',

  // Screenshot
  SCREENSHOT_GET_ALL: 'screenshot:getAll',
  SCREENSHOT_GET_BY_STATUS: 'screenshot:getByStatus',
  SCREENSHOT_UPDATE_STATUS: 'screenshot:updateStatus',
  SCREENSHOT_BATCH_UPDATE: 'screenshot:batchUpdate',

  // AppSetting
  SETTING_GET: 'setting:get',
  SETTING_SET: 'setting:set',
  SETTING_GET_ALL: 'setting:getAll',
} as const
