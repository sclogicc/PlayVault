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
