interface ActiveSessionCandidate {
  id: number
  game_id: number
  tracking_mode?: 'launch_tree' | 'external_path' | 'legacy'
}

/**
 * 外部截图只有在唯一的 PlayVault 启动会话仍在运行时才允许自动归属。
 * 手动启动检测到的 external_path 会话不具备截图来源证明，必须被排除。
 */
export function getPlayVaultLaunchSessionMatch(
  sessions: ActiveSessionCandidate[],
): { game_id: number; session_id: number } | null {
  const launchedSessions = sessions.filter((session) => session.tracking_mode === 'launch_tree')
  if (launchedSessions.length !== 1) return null

  return {
    game_id: launchedSessions[0].game_id,
    session_id: launchedSessions[0].id,
  }
}
