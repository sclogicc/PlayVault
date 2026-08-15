import assert from 'node:assert/strict'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import { build } from 'esbuild'

const outputDir = resolve('out/test')

async function importTypeScriptModule(entryFile, outputFile, externalPackages = false) {
  const outputPath = resolve(outputDir, outputFile)
  await mkdir(dirname(outputPath), { recursive: true })
  await build({
    entryPoints: [entryFile],
    bundle: true,
    format: 'esm',
    platform: 'node',
    packages: externalPackages ? 'external' : undefined,
    outfile: outputPath,
    logLevel: 'silent',
  })
  return import(`${pathToFileURL(outputPath).href}?v=${Date.now()}`)
}

test.after(async () => {
  await rm(outputDir, { recursive: true, force: true })
})

test('game launch options keep the game window visible and use its install directory', async () => {
  const { createGameSpawnOptions } = await importTypeScriptModule(
    'src/main/services/gameLaunchOptions.ts',
    'gameLaunchOptions.mjs',
  )

  const options = createGameSpawnOptions('D:\\Games\\Example Game\\game.exe')

  assert.equal(options.cwd, 'D:\\Games\\Example Game')
  assert.equal(options.windowsHide, false)
  assert.equal(options.detached, true)
  assert.equal(options.stdio, 'ignore')
})

test('only the category named by the current status filter is active', async () => {
  const { isLibraryCategoryActive } = await importTypeScriptModule(
    'src/renderer/src/lib/libraryNavigation.ts',
    'libraryNavigation.mjs',
  )

  assert.equal(isLibraryCategoryActive('all', '/games', ''), true)
  assert.equal(isLibraryCategoryActive('not_started', '/games', ''), false)
  assert.equal(isLibraryCategoryActive('not_started', '/games', '?status=not_started'), true)
  assert.equal(isLibraryCategoryActive('in_progress', '/games', '?status=not_started'), false)
  assert.equal(isLibraryCategoryActive('completed', '/games/42', '?status=completed'), false)
})

test('local screenshot paths use the controlled preview protocol', async () => {
  const { parseLocalMediaUrl, toLocalMediaUrl } = await importTypeScriptModule(
    'src/shared/localMedia.ts',
    'localMedia.mjs',
  )
  const { getImageMimeType } = await importTypeScriptModule(
    'src/main/services/localImage.ts',
    'localImage.mjs',
  )
  const filePath = 'D:\\Screenshots\\example image.PNG'
  const previewUrl = toLocalMediaUrl(filePath)

  assert.equal(parseLocalMediaUrl(previewUrl), filePath)
  assert.equal(getImageMimeType(filePath), 'image/png')
  assert.equal(getImageMimeType('D:\\note.txt'), null)
})

test('registered local media includes game background images', async () => {
  const { isRegisteredMediaPath } = await importTypeScriptModule(
    'src/main/services/mediaRegistry.ts',
    'mediaRegistry.mjs',
  )
  let query = ''
  let params = []
  const db = {
    prepare(sql) {
      query = sql
      return {
        get(...values) {
          params = values
          return { matched: 1 }
        },
      }
    },
  }

  assert.equal(isRegisteredMediaPath(db, 'D:\\art\\game-background.jpg'), true)
  assert.match(query, /background_path\s*=\s*\?/)
  assert.deepEqual(params, [
    'D:\\art\\game-background.jpg',
    'D:\\art\\game-background.jpg',
    'D:\\art\\game-background.jpg',
  ])
})

test('vault media references remain relative and reject directory traversal', async () => {
  const { fromVaultReference, toVaultReference } = await importTypeScriptModule(
    'src/shared/vault.ts',
    'vault-reference.mjs',
  )

  assert.equal(
    toVaultReference('media\\archives\\000001-game\\media\\cover.jpg'),
    'vault://media/archives/000001-game/media/cover.jpg',
  )
  assert.equal(
    fromVaultReference('vault://media/archives/000001-game/media/cover.jpg'),
    'media/archives/000001-game/media/cover.jpg',
  )
  assert.equal(fromVaultReference('vault://media/../secrets.txt'), null)
  assert.throws(() => toVaultReference('../secrets.txt'), /无效/)
})

test('PlayVault capture status uses a low-conflict default and preserves custom shortcuts', async () => {
  const { createGameCaptureStatus, DEFAULT_GAME_CAPTURE_ACCELERATOR } = await importTypeScriptModule(
    'src/shared/capture.ts',
    'game-capture-status.mjs',
  )

  const ready = createGameCaptureStatus('ready', '就绪')
  const custom = createGameCaptureStatus('ready', '就绪', { accelerator: 'Ctrl+Alt+P' })
  const disabled = createGameCaptureStatus('disabled', '已关闭')
  assert.equal(DEFAULT_GAME_CAPTURE_ACCELERATOR, 'Ctrl+Shift+S')
  assert.equal(ready.accelerator, 'Ctrl+Shift+S')
  assert.equal(custom.accelerator, 'Ctrl+Alt+P')
  assert.equal(ready.enabled, true)
  assert.equal(disabled.enabled, false)
})

test('process tracking matches only exact executable paths and retains known child processes', async () => {
  const { collectLiveProcessTree, matchProcessByPath } = await importTypeScriptModule(
    'src/main/services/processTracking.ts',
    'processTracking.mjs',
  )

  assert.equal(
    matchProcessByPath(
      {
        pid: 11,
        parentPid: 1,
        name: 'game.exe',
        executablePath: 'D:\\Games\\Game A\\game.exe',
        startedAt: null,
      },
      'd:/games/game a/game.exe',
    ),
    true,
  )
  assert.equal(
    matchProcessByPath(
      {
        pid: 12,
        parentPid: 1,
        name: 'game.exe',
        executablePath: 'E:\\Other\\game.exe',
        startedAt: null,
      },
      'D:\\Games\\Game A\\game.exe',
    ),
    false,
  )
  assert.deepEqual(
    collectLiveProcessTree(100, [100, 200], [
      {
        pid: 200,
        parentPid: 100,
        name: 'game.exe',
        executablePath: null,
        startedAt: null,
      },
    ]),
    [200],
  )
})

test('Windows CIM query emits UTF-8 so Chinese game paths can be matched', async () => {
  const { buildCimDetailsScript } = await importTypeScriptModule(
    'src/main/services/windowsProcessInspector.ts',
    'windowsProcessInspector.mjs',
  )

  const script = buildCimDetailsScript([59036])
  assert.match(script, /OutputEncoding/)
  assert.match(script, /UTF8Encoding/)
  assert.match(script, /ProcessId = 59036/)
})

test('process monitor diagnostics retain the game, state, and observed process evidence', async () => {
  const { formatProcessMonitorDiagnostic } = await importTypeScriptModule(
    'src/main/services/processMonitorDiagnostics.ts',
    'processMonitorDiagnostics.mjs',
  )

  const line = formatProcessMonitorDiagnostic({
    event: 'poll',
    at: '2026-07-26 19:01:12',
    gameId: 2,
    rootPid: 58320,
    livePids: [],
    phase: 'running',
    action: 'none',
  })

  assert.deepEqual(JSON.parse(line), {
    event: 'poll',
    at: '2026-07-26 19:01:12',
    gameId: 2,
    rootPid: 58320,
    livePids: [],
    phase: 'running',
    action: 'none',
  })
})

test('database inserts return their real generated ID before persisting the file', async () => {
  const { Database } = await importTypeScriptModule(
    'src/main/db/sqljs-wrapper.ts',
    'sqljs-wrapper.mjs',
    true,
  )
  const databasePath = resolve(outputDir, 'last-insert-rowid.sqlite')
  const db = await Database.open(databasePath)
  db.exec('CREATE TABLE entries (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)')

  const result = db.prepare('INSERT INTO entries (name) VALUES (?)').run('session')
  assert.equal(result.lastInsertRowid, 1)
  db.close()
})

test('PlayVault-launched process creates a Session immediately and closes it on process exit', async () => {
  const { spawn } = await import('node:child_process')
  const { once } = await import('node:events')
  const { setTimeout: delay } = await import('node:timers/promises')
  const { Database } = await importTypeScriptModule(
    'src/main/db/sqljs-wrapper.ts',
    'tracked-launch-database.mjs',
    true,
  )
  const { runMigrations } = await importTypeScriptModule(
    'src/main/db/schema.ts',
    'tracked-launch-schema.mjs',
    true,
  )
  const { trackLaunchedProcess } = await importTypeScriptModule(
    'src/main/services/processMonitor.ts',
    'tracked-launch-monitor.mjs',
    true,
  )
  const databasePath = resolve(outputDir, 'tracked-launch.sqlite')
  const db = await Database.open(databasePath)
  runMigrations(db)
  const gameId = db.prepare(
    "INSERT INTO games (name, display_name, status) VALUES (?, ?, 'not_started')",
  ).run('Tracked Process', 'Tracked Process').lastInsertRowid
  db.prepare(
    'INSERT INTO game_executables (game_id, exe_name, file_path, is_primary) VALUES (?, ?, ?, 1)',
  ).run(gameId, basename(process.execPath), process.execPath)

  const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 300)'], {
    windowsHide: true,
  })
  const sessionId = trackLaunchedProcess(
    db,
    gameId,
    child.pid,
    process.execPath,
    '2026-07-26 19:20:00',
    child,
  )

  assert.ok(sessionId > 0)
  assert.equal(db.prepare('SELECT ended_at FROM sessions WHERE id = ?').get(sessionId).ended_at, null)
  await once(child, 'exit')
  await delay(25)
  const session = db.prepare('SELECT ended_at, duration_seconds FROM sessions WHERE id = ?').get(sessionId)
  assert.notEqual(session.ended_at, null)
  assert.ok(session.duration_seconds >= 0)
  db.close()
})

test('session tracker ends only after three missing polls and uses the last confirmed time', async () => {
  const { advanceTracker, createIdleTrackerState } = await importTypeScriptModule(
    'src/main/services/sessionTrackingState.ts',
    'sessionTrackingState.mjs',
  )
  let state = createIdleTrackerState()

  state = advanceTracker(state, [100], '2026-07-25 10:00:00').state
  state = advanceTracker(state, [100], '2026-07-25 10:00:02').state
  const started = advanceTracker(state, [100], '2026-07-25 10:00:04')
  assert.equal(started.action.type, 'start')

  state = { ...started.state, sessionId: 9 }
  state = advanceTracker(state, [], '2026-07-25 10:00:06').state
  state = advanceTracker(state, [], '2026-07-25 10:00:08').state
  const ended = advanceTracker(state, [], '2026-07-25 10:00:10')
  assert.deepEqual(ended.action, { type: 'end', endedAt: '2026-07-25 10:00:04' })
})

test('external process discovery starts a Session on the first exact-path observation', async () => {
  const { advanceTracker, createIdleTrackerState } = await importTypeScriptModule(
    'src/main/services/sessionTrackingState.ts',
    'immediate-external-tracker.mjs',
  )

  const result = advanceTracker(
    createIdleTrackerState(),
    [100],
    '2026-07-26 19:20:00',
    100,
    1,
  )
  assert.deepEqual(result.action, {
    type: 'start',
    startedAt: '2026-07-26 19:20:00',
    rootPid: 100,
    trackedPids: [100],
  })
  assert.equal(result.state.phase, 'running')
})

test('game detail Session data refreshes every second without page navigation', async () => {
  const { SESSION_REFRESH_INTERVAL_MS } = await importTypeScriptModule(
    'src/renderer/src/lib/sessionRefresh.ts',
    'sessionRefresh.mjs',
  )

  assert.equal(SESSION_REFRESH_INTERVAL_MS, 1000)
})

test('game detail uses compact contact-sheet panels without item limits', async () => {
  const {
    SCREENSHOT_GRID_CLASS,
    SCREENSHOT_PANEL_SCROLL_CLASS,
    SESSION_PANEL_SCROLL_CLASS,
  } = await importTypeScriptModule(
    'src/renderer/src/lib/gameDetailPanelLayout.ts',
    'gameDetailPanelLayout.mjs',
  )
  const source = await readFile('src/renderer/src/pages/GameDetail.tsx', 'utf8')

  assert.match(SESSION_PANEL_SCROLL_CLASS, /max-h-\[320px\]/)
  assert.match(SESSION_PANEL_SCROLL_CLASS, /sm:max-h-\[280px\]/)
  assert.match(SESSION_PANEL_SCROLL_CLASS, /overflow-y-auto/)
  assert.match(SCREENSHOT_PANEL_SCROLL_CLASS, /max-h-\[336px\]/)
  assert.match(SCREENSHOT_PANEL_SCROLL_CLASS, /overflow-y-auto/)
  assert.equal(SCREENSHOT_GRID_CLASS, 'media-contact-sheet')
  assert.doesNotMatch(source, /xl:row-span-2/)
  assert.doesNotMatch(source, /sessions\.slice\(0,\s*20\)/)
  assert.doesNotMatch(source, /gameScreenshots\.slice\(0,\s*24\)/)
})

test('Session timestamps are stored as local Windows time, not stripped UTC', async () => {
  const { toLocalDateTime } = await importTypeScriptModule(
    'src/shared/localDateTime.ts',
    'localDateTime.mjs',
  )
  assert.equal(
    toLocalDateTime(new Date('2026-07-26T10:39:15.000Z')),
    '2026-07-26 18:39:15',
  )
})

test('image viewer navigation wraps at both ends of the screenshot list', async () => {
  const { getNextImageIndex } = await importTypeScriptModule(
    'src/renderer/src/lib/imageViewerNavigation.ts',
    'imageViewerNavigation.mjs',
  )

  assert.equal(getNextImageIndex(0, -1, 3), 2)
  assert.equal(getNextImageIndex(2, 1, 3), 0)
  assert.equal(getNextImageIndex(1, 1, 3), 2)
  assert.equal(getNextImageIndex(0, 1, 0), 0)
})

test('cover crop settings fall back safely and clamp invalid values', async () => {
  const { getCoverCropResetKey, parseCoverCrop, serializeCoverCrop } = await importTypeScriptModule(
    'src/shared/coverCrop.ts',
    'coverCrop.mjs',
  )

  assert.deepEqual(parseCoverCrop(''), { zoom: 1, x: 0, y: 0 })
  assert.deepEqual(
    parseCoverCrop('{"zoom":9,"x":-300,"y":250}'),
    { zoom: 3, x: -100, y: 100 },
  )
  assert.equal(
    serializeCoverCrop({ zoom: 9, x: -300, y: 250 }),
    '{"zoom":3,"x":-100,"y":100}',
  )
  assert.equal(
    getCoverCropResetKey('D:\\covers\\game.jpg', '2 / 3', { zoom: 1, x: 0, y: 0 }),
    getCoverCropResetKey('D:\\covers\\game.jpg', '2 / 3', { zoom: 1, x: 0, y: 0 }),
  )
})

test('backdrop crop migrates legacy settings and translates the image within scaled bounds', async () => {
  const { getBackdropImageStyle, parseBackdropCrop, serializeBackdropCrop } = await importTypeScriptModule(
    'src/shared/backdropCrop.ts',
    'backdropCrop.mjs',
  )

  assert.deepEqual(parseBackdropCrop('{"zoom":2.4,"x":60,"y":-35}'), { zoom: 1.1, focalX: 0, focalY: 0 })
  assert.deepEqual(
    parseBackdropCrop('{"zoom":2.4,"x":60,"y":-35,"backgroundCropVersion":2}'),
    { zoom: 1.5, focalX: 0.6, focalY: -0.35 },
  )
  assert.equal(
    serializeBackdropCrop({ zoom: 2.4, focalX: 3, focalY: -3 }),
    '{"zoom":1.5,"focalX":1,"focalY":-1,"backdropCropVersion":1}',
  )
  assert.equal(
    getBackdropImageStyle({ zoom: 1.5, focalX: 1, focalY: -1 }).transform,
    'translate3d(25%, -25%, 0) scale(1.5)',
  )
})

test('media roles are rendered by independent cover, backdrop and screenshot components', async () => {
  const gameDetail = await readFile(resolve('src/renderer/src/pages/GameDetail.tsx'), 'utf8')
  const coverEditor = await readFile(resolve('src/renderer/src/components/games/CoverCropEditor.tsx'), 'utf8')

  assert.match(gameDetail, /BackdropStage/)
  assert.match(gameDetail, /BackdropEditor/)
  assert.match(gameDetail, /CoverFrame/)
  assert.match(gameDetail, /ScreenshotFrame/)
  assert.doesNotMatch(coverEditor, /cropMode/)
})

test('new screenshots are auto-classified only when one Session is active', async () => {
  const { getUniqueActiveSessionMatch } = await importTypeScriptModule(
    'src/main/services/screenshotSessionMatcher.ts',
    'screenshotSessionMatcher.mjs',
  )

  assert.deepEqual(
    getUniqueActiveSessionMatch([{ id: 12, game_id: 5 }]),
    { game_id: 5, session_id: 12 },
  )
  assert.equal(getUniqueActiveSessionMatch([]), null)
  assert.equal(
    getUniqueActiveSessionMatch([
      { id: 12, game_id: 5 },
      { id: 13, game_id: 8 },
    ]),
    null,
  )
})

test('library navigation expands one alphabetically sorted game list', async () => {
  const { getLibraryGameList, toggleLibraryOpen } = await importTypeScriptModule(
    'src/renderer/src/lib/libraryNavigation.ts',
    'libraryNavigation.mjs',
  )

  assert.deepEqual(
    getLibraryGameList([
      { id: 3, display_name: '塞尔达传说', status: 'completed' },
      { id: 1, display_name: 'Elden Ring', status: 'in_progress' },
      { id: 2, display_name: 'Baldur\'s Gate 3', status: 'not_started' },
    ]).map((game) => game.id),
    [3, 2, 1],
  )
  assert.equal(toggleLibraryOpen(false), true)
  assert.equal(toggleLibraryOpen(true), false)
})


test('updates are manual and use npm ci without a global startup banner', async () => {
  const [mainSource, appLayoutSource, updaterSource] = await Promise.all([
    readFile('src/main/index.ts', 'utf8'),
    readFile('src/renderer/src/components/layout/AppLayout.tsx', 'utf8'),
    readFile('src/main/services/autoUpdater.ts', 'utf8'),
  ])

  assert.doesNotMatch(mainSource, /checkForUpdates/)
  assert.doesNotMatch(appLayoutSource, /UpdateBanner/)
  assert.match(updaterSource, /NPM_COMMAND, \['ci'\]/)
  assert.doesNotMatch(updaterSource, /NPM_COMMAND, \['install'\]/)
})


test('image viewer is portalled to the viewport and locks background scrolling', async () => {
  const source = await readFile('src/renderer/src/components/ui/ImageViewer.tsx', 'utf8')

  assert.match(source, /createPortal\(/)
  assert.match(source, /document\.body/)
  assert.match(source, /document\.body\.style\.overflow = 'hidden'/)
  assert.match(source, /document\.documentElement\.style\.overflow = 'hidden'/)
  assert.match(source, /fixed inset-0 z-\[9999\] h-\[100dvh\] w-\[100dvw\] overflow-hidden/)
  assert.match(source, /max-h-\[calc\(100dvh-5\.5rem\)\]/)
})
