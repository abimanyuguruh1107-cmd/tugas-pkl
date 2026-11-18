/**
 * Formatting helpers for dates, times, and durations.
 *
 * All timestamps are stored in UTC by the backend and rendered in the
 * viewer's local timezone. Recurrence rules are interpreted using the
 * meeting's original IANA timezone.
 */

const DEFAULT_LOCALE = 'en-US'

function toDate(value: string | number | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

export function formatDate(
  value: string | number | Date,
  locale = DEFAULT_LOCALE,
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
  }).format(toDate(value))
}

export function formatTime(
  value: string | number | Date,
  locale = DEFAULT_LOCALE,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeStyle: 'short',
  }).format(toDate(value))
}

export function formatDateTime(
  value: string | number | Date,
  locale = DEFAULT_LOCALE,
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(toDate(value))
}

/** Format a time range, e.g. "09:00 – 10:30". */
export function formatTimeRange(
  start: string | number | Date,
  end: string | number | Date,
  locale = DEFAULT_LOCALE,
): string {
  return `${formatTime(start, locale)} – ${formatTime(end, locale)}`
}

/** Human-readable relative time, e.g. "in 3 hours" / "2 days ago". */
export function formatRelative(
  value: string | number | Date,
  locale = DEFAULT_LOCALE,
): string {
  const target = toDate(value)
  const diffMs = target.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60_000)

  const units: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
    { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
    { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
    { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
    { unit: 'day', ms: 24 * 60 * 60 * 1000 },
    { unit: 'hour', ms: 60 * 60 * 1000 },
    { unit: 'minute', ms: 60 * 1000 },
  ]

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  for (const { unit, ms } of units) {
    if (Math.abs(diffMs) >= ms) {
      return formatter.format(Math.round(diffMs / ms), unit)
    }
  }

  return formatter.format(diffMinutes, 'minute')
}

/** Format a duration in seconds as "1h 05m" / "12m 30s". */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${String(remainder).padStart(2, '0')}s`
  }
  return `${remainder}s`
}

/** Format a byte size for recording and file listings, e.g. "12.4 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`
}

/** Format a timestamp as `mm:ss` for transcript seek positions. */
export function formatTimestamp(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}
