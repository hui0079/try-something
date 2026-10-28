export const DEFAULT_INTERVAL_DAYS = 30
export const MIN_INTERVAL_DAYS = 1
export const MAX_INTERVAL_DAYS = 365
export const MAX_PATIENT_IDENTIFIER_LENGTH = 50
export const MAX_NOTE_LENGTH = 500

export type TextValidationError = 'required' | 'too-long'
export type IntervalValidationError = 'not-integer' | 'out-of-range'

function assertValidDate(date: Date): void {
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError('Invalid date')
  }
}

export function addCalendarDays(date: Date, days: number): Date {
  assertValidDate(date)
  if (validateIntervalDays(days) !== null) {
    throw new RangeError('Days must be an integer within the supported interval range')
  }

  const result = new Date(date.getTime())
  result.setDate(result.getDate() + days)
  return result
}

export function combineLocalDateAndTime(dateText: string, timeText: string): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeText)
  if (dateMatch === null || timeMatch === null) {
    throw new RangeError('Date or time has an invalid format')
  }

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59
  ) {
    throw new RangeError('Date or time is outside its valid range')
  }

  const result = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day ||
    result.getHours() !== hour ||
    result.getMinutes() !== minute
  ) {
    throw new RangeError('Date or time does not exist locally')
  }

  return result
}

export function toUnixSeconds(date: Date): number {
  assertValidDate(date)
  return Math.floor(date.getTime() / 1000)
}

export function validatePatientIdentifier(
  value: string,
): TextValidationError | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return 'required'
  }
  return trimmed.length > MAX_PATIENT_IDENTIFIER_LENGTH ? 'too-long' : null
}

export function validateNote(value: string): 'too-long' | null {
  return value.trim().length > MAX_NOTE_LENGTH ? 'too-long' : null
}

export function validateIntervalDays(
  value: number,
): IntervalValidationError | null {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return 'not-integer'
  }
  if (value < MIN_INTERVAL_DAYS || value > MAX_INTERVAL_DAYS) {
    return 'out-of-range'
  }
  return null
}
