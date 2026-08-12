interface ActiveSessionCandidate {
  id: number
  game_id: number
}

/**
 * A newly captured screenshot belongs to a game only when exactly one
 * PlayVault Session is currently active. Ambiguous captures stay pending.
 */
export function getUniqueActiveSessionMatch(
  sessions: ActiveSessionCandidate[],
): { game_id: number; session_id: number } | null {
  if (sessions.length !== 1) return null

  return {
    game_id: sessions[0].game_id,
    session_id: sessions[0].id,
  }
}
