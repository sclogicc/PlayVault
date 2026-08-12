# PlayVault 自动计时与截图自动归档实施计划

> **供编码执行者使用：** 按任务顺序实施。每个任务必须先写失败测试，再完成最小实现。本计划只解决自动计时与截图自动归档，不做游戏库视觉重构。

**目标：** 用户退出本地单机游戏后，PlayVault 自动准确结束同一条 Session；用户使用 NVIDIA 截图时，新截图自动归入当前游戏和当前 Session。

**架构：** 用“完整路径 + 已绑定 PID + 进程树”取代现有的纯 exe 名称轮询。PlayVault 启动游戏时记录根 PID；外部启动时只接受与主 exe 完整路径一致的进程。活跃 Session 持久化最后一次确认运行时间，重启应用时先恢复仍在运行的进程，否则按最后确认时间安全结束，绝不补记离线时间。

**技术栈：** Electron、TypeScript、sql.js、ps-list、Windows PowerShell/CIM、chokidar、Node test。

## 全局约束

- 仅服务 Windows 个人桌面环境。
- “结束本次游玩”不是正常流程，只能作为异常兜底操作。
- 不得只凭 `exe_name` 创建或延续自动 Session；外部启动必须校验完整路径。
- 自动监控只使用每个游戏的主可执行文件（`is_primary = 1`），不得把配置器、卸载器或扫描出的全部 exe 当作游戏进程。
- 不引入云同步、Steam 同步、成就、OCR、图像识别或全局截图 AI 分类。
- 不改变游戏三态、游戏档案保留、截图回收站、封面和背景图。
- 文档不提交 Git；代码任务完成后仅提交源代码与测试。

## 现状与根因

当前 [processMonitor.ts](../src/main/services/processMonitor.ts) 已每 2 秒扫描一次进程，并在连续 3 次未发现后结束 Session。但它用 `gameId + exeName` 作为跟踪键，不含真实 exe 完整路径和 PID 身份，导致：

- 不同目录的同名 `game.exe` 可能误判。
- 启动器、配置器和游戏本体都可能创建 Session。
- [sessionRepository.ts](../src/main/db/repositories/sessionRepository.ts) 的 `recoverOrphanedSessions` 以当前时间结束遗留 Session，会错误计入应用关闭期间的时间。
- 截图监听读取数据库所有活跃 Session；遗留或重复 Session 会让自动归类失去确定性。

对标 Playnite 的开源进程监控原则：优先跟踪特定进程与进程树；无法取得根 PID 时按安装目录或可执行文件完整路径匹配；进程名只能作辅助信息，不能单独作为自动计时依据。

## 目标行为

### 从 PlayVault 启动

1. 用户点击“启动游戏”，启动服务以主 exe 所在目录为工作目录，并取得根 PID。
2. 监控服务跟踪根 PID 及其后代进程；启动器退出后，已发现的游戏子进程继续属于原 Session。
3. 所有跟踪 PID 连续 3 次轮询不存在后，以最后一次确认运行时间自动结束 Session。

### 从桌面或资源管理器启动

1. 监控服务仅枚举已绑定主 exe 的候选进程名。
2. 对候选 PID 查询真实 `ExecutablePath`。
3. 只有该路径与 `game_executables.file_path` 忽略大小写后完全相同，才开始自动 Session。

### 截图

1. 只对监听启动后的新增图片自动归类；历史扫描图片保持待整理。
2. 恰好一条已验证活跃 Session 时，新截图立即写入对应 `game_id` 和 `session_id`。
3. 没有或多于一条已验证活跃 Session 时，截图保留 `pending`，不猜测归属。

---

## 任务 1：建立可验证的 Windows 进程快照服务

**文件：**
- 新建：`src/main/services/windowsProcessInspector.ts`
- 新建：`src/main/services/processTrackingMatcher.ts`
- 新建：`tests/process-tracking.test.mjs`

**接口：**

```ts
export interface ProcessSnapshot {
  pid: number
  parentPid: number | null
  name: string
  executablePath: string | null
  startedAt: string | null
}

export function matchProcessByPath(
  process: ProcessSnapshot,
  executablePath: string,
): boolean

export function collectLiveProcessTree(
  rootPid: number,
  previouslyTrackedPids: number[],
  processes: ProcessSnapshot[],
): number[]
```

**实现规则：**

1. 使用已有 `ps-list` 获取 PID、父 PID 和进程名。
2. 仅对名称匹配“已绑定主 exe 名称”的候选 PID，通过 Windows PowerShell/CIM 查询 `ExecutablePath` 与创建时间；不得每 2 秒查询全量进程路径。
3. 比对前规范化盘符、反斜杠与大小写，必须比较完整路径；不得使用 `includes`、文件名比较或目录前缀比较。
4. 从根 PID 和上次已经跟踪的 PID 出发，保留仍存在的 PID，并持续纳入它们的子进程。
5. 单个候选 PID 的 PowerShell 查询失败时返回 `executablePath: null`。外部启动不得创建 Session；由 PlayVault 直接启动的根 PID 仍可依赖 PID/进程树跟踪。

**先写测试：**

```js
test('同名 exe 只有完整路径相同才可匹配', () => {
  assert.equal(matchProcessByPath(
    { pid: 11, parentPid: 1, name: 'game.exe', executablePath: 'D:\\Games\\A\\game.exe', startedAt: null },
    'D:\\Games\\A\\game.exe',
  ), true)
  assert.equal(matchProcessByPath(
    { pid: 12, parentPid: 1, name: 'game.exe', executablePath: 'E:\\Other\\game.exe', startedAt: null },
    'D:\\Games\\A\\game.exe',
  ), false)
})

test('启动器退出后仍保留已发现的游戏子进程', () => {
  assert.deepEqual(
    collectLiveProcessTree(100, [100, 200], [
      { pid: 200, parentPid: 100, name: 'game.exe', executablePath: null, startedAt: null },
    ]),
    [200],
  )
})
```

**验收：** 相同文件名但路径不同的进程不会命中；启动器退出后子进程仍在时，进程树保持活跃。

---

## 任务 2：扩展 Session 持久化数据并安全迁移

**文件：**
- 修改：`src/main/db/schema.ts`
- 修改：`src/shared/types.ts`
- 修改：`src/shared/constants.ts`
- 修改：`src/main/db/repositories/sessionRepository.ts`
- 测试：`tests/session-tracking-repository.test.mjs`

**新增 `sessions` 字段：**

| 字段 | 类型 | 作用 |
|---|---|---|
| `root_process_pid` | `INTEGER`，可空 | 本次游玩的启动根 PID。 |
| `tracked_process_pids` | `TEXT NOT NULL DEFAULT '[]'` | 当前或最后确认的进程树 PID JSON 数组。 |
| `process_started_at` | `TEXT`，可空 | 根进程创建时间，降低 PID 重用误判。 |
| `last_seen_at` | `TEXT`，可空 | 最后确认运行时间；自动结束和崩溃恢复的唯一计时上限。 |
| `tracking_mode` | `TEXT NOT NULL DEFAULT 'external_path'` | 仅允许 `launch_tree`、`external_path`、`legacy`。 |

**迁移规则：**

1. 新迁移只能追加字段和索引，不得重建或删除 `sessions` 表。
2. 已结束历史 Session 的时长不得变化。
3. 旧活跃 Session 填充 `tracking_mode = 'legacy'`、`last_seen_at = started_at`；不得补记到当前时间。
4. 增加索引：`sessions(ended_at, game_id)` 与 `sessions(root_process_pid)`。
5. 不在迁移中创建“每游戏仅一条活跃 Session”的唯一索引。重复历史数据由恢复逻辑安全关闭，避免迁移失败或丢失时长。

**仓储接口：**

```ts
export function createAutoSession(db, data: {
  gameId: number; exeName: string; processPath: string
  rootProcessPid: number; processStartedAt: string | null
  trackingMode: 'launch_tree' | 'external_path'; startedAt: string
}): { lastInsertRowid: number }

export function heartbeatSession(db, sessionId: number, data: {
  trackedProcessPids: number[]; lastSeenAt: string
}): void

export function endSessionAtLastSeen(
  db, sessionId: number, reason: 'normal' | 'recovered',
): void
```

**验收：** 旧时长不变；新自动 Session 能保存 PID、路径、心跳和跟踪方式；恢复操作不使用当前时间虚增时长。

---

## 任务 3：以 PID 与进程树重写自动 Session 状态机

**文件：**
- 修改：`src/main/services/processMonitor.ts`
- 新建：`src/main/services/sessionTrackingState.ts`
- 修改：`src/main/db/repositories/sessionRepository.ts`
- 测试：`tests/session-tracking-state.test.mjs`

**状态机规则：**

| 状态 | 进入条件 | 行为 | 退出条件 |
|---|---|---|---|
| `idle` | 没有候选进程 | 等待。 | 发现路径验证的外部进程，或收到 PlayVault 启动 PID。 |
| `warming` | 首次发现候选 PID | 连续观察 3 次，记录首次发现时间。 | 连续 3 次存在则创建 Session；中途消失则回到 `idle`。 |
| `running` | 已创建 Session | 每次轮询更新进程树和 `last_seen_at`。 | 所有追踪 PID 连续 3 次不存在。 |
| `manually_stopped` | 用户明确停止计时 | 结束当前 Session，忽略同一进程树直到全部退出。 | 进程树退出后回到 `idle`。 |

**强制业务规则：**

1. 自动监控目标只来自 `game_executables.is_primary = 1` 且 `file_path` 非空的绑定。
2. 不再遍历同一游戏的全部未忽略 exe 来创建 Session。
3. 同一游戏已有活跃 Session 时：根 PID 相同则恢复同一条；根 PID 不同则按旧记录的 `last_seen_at` 以 `recovered` 结束旧记录，再开始新记录。
4. 自动结束时使用 `last_seen_at` 作为 `ended_at`，不能使用第三次漏检时的当前时间。
5. 创建第一条有效自动 Session 后，仍保持 `not_started -> in_progress`；`completed` 永不自动回退。
6. 轮询周期保持 2 秒，稳定阈值保持 3 次，最短有效观察时间约 6 秒。

**先写测试：**

```js
test('同一 PID 重复观察只创建一条 Session', () => {
  const state = createTrackerState()
  state.observe({ gameId: 3, pid: 100, path: 'D:\\Games\\A\\game.exe', now: '2026-07-25T10:00:00Z' })
  state.observe({ gameId: 3, pid: 100, path: 'D:\\Games\\A\\game.exe', now: '2026-07-25T10:00:02Z' })
  assert.equal(
    state.observe({ gameId: 3, pid: 100, path: 'D:\\Games\\A\\game.exe', now: '2026-07-25T10:00:04Z' }).type,
    'start',
  )
  assert.equal(
    state.observe({ gameId: 3, pid: 100, path: 'D:\\Games\\A\\game.exe', now: '2026-07-25T10:00:06Z' }).type,
    'heartbeat',
  )
})

test('连续三次未发现进程时以最后心跳时间结束', () => {
  const state = createRunningTrackerState({ lastSeenAt: '2026-07-25T10:10:00Z' })
  state.observeMissing('2026-07-25T10:10:02Z')
  state.observeMissing('2026-07-25T10:10:04Z')
  assert.deepEqual(
    state.observeMissing('2026-07-25T10:10:06Z'),
    { type: 'end', endedAt: '2026-07-25T10:10:00Z' },
  )
})
```

**验收：** 用户正常退出游戏后约 6 秒内自动结束 Session；同一游戏连续启动不会遗留旧活跃记录并创建重复记录。

---

## 任务 4：PlayVault 启动 PID 与应用重启恢复

**文件：**
- 修改：`src/main/services/gameLauncher.ts`
- 修改：`src/main/ipc/gameHandlers.ts`
- 修改：`src/main/services/processMonitor.ts`
- 修改：`src/main/index.ts`
- 修改：`src/shared/types.ts`
- 测试：`tests/game-launch-tracking.test.mjs`

**启动规则：**

1. 用 Node `child_process.spawn` 启动主 exe，不再只调用 `shell.openPath`。
2. `cwd` 是主 exe 所在目录；设置 `detached` 并调用 `unref()`，确保 PlayVault 退出不关闭游戏。
3. `launchGame` 返回 `pid`、启动路径和成功状态；IPC 成功后调用 `registerLaunchedRoot(gameId, pid, filePath, startedAt)`。
4. 无法取得 PID 时可回退 `shell.openPath`，但只允许通过完整路径外部匹配开始记录，禁止名称匹配。

**重启恢复规则：**

1. 将 [index.ts](../src/main/index.ts) 的启动即 `recoverOrphanedSessions` 改为 `resumeOrCloseTrackedSessions`。
2. 启动后先获取一次进程快照，再开始常规轮询。
3. 活跃 Session 的 `tracked_process_pids` 存在路径和创建时间一致的进程时，恢复内存追踪并保留同一 Session。
4. 不存在匹配进程时，以 `last_seen_at` 结束并标记 `recovered`；旧 `legacy` 活跃记录同样以其 `last_seen_at` 结束。

**验收：** PlayVault 关闭再打开时，仍在运行的游戏延续原 Session；已退出的游戏不会计入 PlayVault 关闭期间的时间。

---

## 任务 5：截图仅绑定到“已验证活跃 Session”

**文件：**
- 修改：`src/main/services/screenshotWatcher.ts`
- 修改：`src/main/services/screenshotSessionMatcher.ts`
- 修改：`src/main/db/repositories/sessionRepository.ts`
- 测试：`tests/screenshot-auto-classification.test.mjs`

**实现规则：**

1. 新增 `getVerifiedActiveSessions(db)`：只返回 `ended_at IS NULL`、`last_seen_at` 非空、并由进程监控确认仍运行的自动 Session。
2. `screenshotWatcher` 只在 chokidar 新增文件事件中调用它；初始递归扫描保持历史图片全部 `pending`。
3. 配置 `awaitWriteFinish`：`stabilityThreshold: 500`、`pollInterval: 100`，避免读取未写完的 NVIDIA 图片。该等待只确保文件稳定，不增加用户操作。
4. 只有唯一 Session 才自动归类；0 条或多条时保持待整理。
5. 不使用截图文件名、文件夹名、AI、图像内容或模糊时间窗口猜测游戏。
6. 保留哈希去重和 `deleted` 截图不重新导入逻辑。

**先写测试：**

```js
test('唯一已验证活跃 Session 的新截图自动归档', () => {
  assert.deepEqual(getUniqueActiveSessionMatch([
    { id: 21, game_id: 7, last_seen_at: '2026-07-25T10:00:00Z' },
  ]), { game_id: 7, session_id: 21 })
})

test('多个活跃 Session 时截图不猜测归属', () => {
  assert.equal(getUniqueActiveSessionMatch([
    { id: 21, game_id: 7, last_seen_at: '2026-07-25T10:00:00Z' },
    { id: 22, game_id: 8, last_seen_at: '2026-07-25T10:00:00Z' },
  ]), null)
})
```

**验收：** 单个正在自动记录的游戏运行时，新的 NVIDIA 截图无需人工处理即显示在该游戏截图区域；旧截图、无游戏运行时截图和多游戏并行截图仍可在待整理中处理。

---

## 任务 6：界面将手动结束降级为兜底操作

**文件：**
- 修改：`src/renderer/src/pages/GameDetail.tsx`
- 视需要修改：`src/renderer/src/hooks/useSessions.ts`
- 测试：`tests/ui-regressions.test.mjs`

**界面规则：**

1. 活跃 Session 显示“正在自动记录”、已记录时长和被跟踪的 exe 名称。
2. 头部“结束本次游玩”改为次级操作“停止计时”，放入更多操作或要求二次确认；说明“正常退出游戏会自动结束计时”。
3. Session 历史中的手动结束图标同样降为次级操作。
4. 发现 Session 存在但进程尚未验证时，显示简短警告和“检查绑定路径”入口；不得让用户日常手动结束。
5. 不修改游戏三态、封面和背景图、截图回收站或游戏删除语义。

**验收：** 正常游玩只需启动和退出游戏，不必回到 PlayVault 点击结束；异常时仍可主动停止计时。

---

## 总体验收清单

- [ ] 从 PlayVault 启动直接运行的游戏，退出后约 6 秒自动结束同一条 Session。
- [ ] 从桌面或资源管理器启动已绑定主 exe 的游戏，也会自动开始和自动结束。
- [ ] 两个不同目录的同名 `game.exe` 同时存在时，只记录完整路径匹配的游戏。
- [ ] 启动器先退出、游戏子进程仍在运行时，Session 不提前结束。
- [ ] 配置器、卸载器等非主 exe 不会创建自动 Session。
- [ ] 关闭并重开 PlayVault 时，仍在运行的游戏继续原 Session，不新建重复记录。
- [ ] PlayVault 关闭期间游戏已退出时，不会把离线时间算进时长。
- [ ] 单个已验证游戏运行时，新增 NVIDIA 截图自动归入正确游戏和 Session。
- [ ] 没有活跃游戏或存在多个活跃游戏时，截图保持待整理。
- [ ] `npm test`、`npm run typecheck`、`npm run build` 全部通过。

## 禁止修改

- 不删除既有游戏、Session、截图、回收站或已永久删除记录。
- 不改变三态定义：未开始、未通关、已通关。
- 不扩展为 Playnite/Steam 的商店、云同步、成就或 Mod 管理器。
- 不对历史截图批量自动重新分类。
- 不依赖截图文件名、AI 识图或不可靠时间窗口猜测截图归属。
- 不为本计划重构游戏库封面墙、详情页视觉设计或数据库框架。
