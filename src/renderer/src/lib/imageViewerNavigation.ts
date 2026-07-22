export function getNextImageIndex(
  currentIndex: number,
  direction: -1 | 1,
  total: number,
): number {
  if (total <= 0) return 0
  return (currentIndex + direction + total) % total
}
