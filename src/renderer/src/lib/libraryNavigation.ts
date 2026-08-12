export function isLibraryCategoryActive(
  categoryKey: string,
  pathname: string,
  search: string,
): boolean {
  if (pathname !== '/games') return false

  const selectedStatus = new URLSearchParams(search).get('status')
  return categoryKey === 'all'
    ? selectedStatus === null
    : selectedStatus === categoryKey
}

interface LibraryGame {
  id: number
  display_name: string
}

export function getLibraryGameList<T extends LibraryGame>(games: T[]): T[] {
  return [...games].sort((a, b) =>
    a.display_name.localeCompare(b.display_name, 'zh-CN'),
  )
}

export function toggleLibraryOpen(isOpen: boolean): boolean {
  return !isOpen
}
