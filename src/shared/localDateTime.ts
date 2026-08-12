function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Format a Date as a timezone-free SQLite timestamp in the Windows local timezone. */
export function toLocalDateTime(date: Date = new Date()): string {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
