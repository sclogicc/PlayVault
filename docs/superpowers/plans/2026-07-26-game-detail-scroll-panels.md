# Game Detail Scroll Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将游戏详情页的游玩记录和截图墙改为两个紧凑、独立滚动的内容区，避免页面随数据量无限增长。

**Architecture:** 保持现有 `GameDetail` 数据流和组件结构，只在渲染层增加固定最大高度、内部滚动和响应式网格。布局类集中到一个小型常量模块，便于测试和后续统一调整；不修改数据库、IPC 或计时逻辑。

**Tech Stack:** React 18、TypeScript、Tailwind CSS、Node test runner、esbuild。

## Global Constraints

- Session 面板移动端最大高度 320px，桌面端最大高度 280px。
- 截图面板移动端最大高度 420px，桌面端最大高度 360px。
- 展示全部 Session 和截图，不再保留 20/24 条截断。
- 保持截图预览、Session 操作、自动计时刷新和现有视觉体系。
- 不修改数据库、主进程、IPC 和数据模型。

---

### Task 1: 滚动面板布局与数量限制移除

**Files:**
- Create: `src/renderer/src/lib/gameDetailPanelLayout.ts`
- Modify: `src/renderer/src/pages/GameDetail.tsx`
- Test: `tests/ui-regressions.test.mjs`

**Interfaces:**
- Produces: `SESSION_PANEL_SCROLL_CLASS`, `SCREENSHOT_PANEL_SCROLL_CLASS`, `SCREENSHOT_GRID_CLASS` 三个 CSS 类常量。
- Consumes: `GameDetail` 已有的 `sessions`、`gameScreenshots`、`ScreenshotThumb` 和 Session 操作逻辑。

- [x] **Step 1: 写失败测试**

验证三个布局常量包含固定高度、`overflow-y-auto` 和响应式列数；读取 `GameDetail.tsx`，确认不再出现 `sessions.slice(0, 20)` 与 `gameScreenshots.slice(0, 24)`。

- [x] **Step 2: 运行测试并确认失败**

Run: `npm test`

Expected: FAIL，因为 `gameDetailPanelLayout.ts` 尚不存在，且当前页面仍使用数量截断。

- [x] **Step 3: 实现最小界面修改**

创建布局常量：

```ts
export const SESSION_PANEL_SCROLL_CLASS =
  'max-h-[320px] sm:max-h-[280px] overflow-y-auto overscroll-contain pr-1'
export const SCREENSHOT_PANEL_SCROLL_CLASS =
  'max-h-[420px] sm:max-h-[360px] overflow-y-auto overscroll-contain pr-1'
export const SCREENSHOT_GRID_CLASS =
  'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-1.5'
```

在 `GameDetail.tsx` 中：

- Session 列表改用 `sessions.map(...)`，外层使用 `SESSION_PANEL_SCROLL_CLASS`。
- Session 行改为更小的间距和内边距，并允许窄屏换行。
- 截图列表改用 `gameScreenshots.map(...)`，网格使用 `SCREENSHOT_GRID_CLASS`。
- 截图网格外层使用 `SCREENSHOT_PANEL_SCROLL_CLASS`。

- [x] **Step 4: 运行完整验证**

Run: `npm test && npm run typecheck && npm run build`

Expected: 全部命令退出码为 0，截图点击索引和列表顺序保持一致。

- [x] **Step 5: 检查差异**

Run: `git diff --check`

Expected: 无空白错误；不提交本地设计与计划文档。
