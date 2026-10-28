import {
  DEFAULT_INTERVAL_DAYS,
  MAX_INTERVAL_DAYS,
  MAX_NOTE_LENGTH,
  MAX_PATIENT_IDENTIFIER_LENGTH,
  MIN_INTERVAL_DAYS,
  addCalendarDays,
  combineLocalDateAndTime,
  toUnixSeconds,
  validateIntervalDays,
  validateNote,
  validatePatientIdentifier,
} from '../miniprogram/utils/reminder'

declare const require: (id: 'node:test') => {
  test: (name: string, action: () => void) => void
}

const { test } = require('node:test')

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function equal<T>(actual: T, expected: T, message: string): void {
  assert(
    Object.is(actual, expected),
    `${message}: expected ${String(expected)}, received ${String(actual)}`,
  )
}

function throws(action: () => unknown, message: string): void {
  let thrown = false
  try {
    action()
  } catch {
    thrown = true
  }
  assert(thrown, message)
}

test('uses a 30-day default interval', () => {
  equal(DEFAULT_INTERVAL_DAYS, 30, 'default interval')
})

test('adds natural days while preserving local time at month end', () => {
  const result = addCalendarDays(new Date(2025, 0, 31, 9, 17, 23), 1)
  equal(result.getFullYear(), 2025, 'year')
  equal(result.getMonth(), 1, 'month')
  equal(result.getDate(), 1, 'day')
  equal(result.getHours(), 9, 'hour')
  equal(result.getMinutes(), 17, 'minute')
  equal(result.getSeconds(), 23, 'second')
})

test('adds natural days across year end', () => {
  const result = addCalendarDays(new Date(2025, 11, 31, 15, 30, 45), 1)
  equal(result.getFullYear(), 2026, 'year')
  equal(result.getMonth(), 0, 'month')
  equal(result.getDate(), 1, 'day')
  equal(result.getHours(), 15, 'hour')
  equal(result.getMinutes(), 30, 'minute')
  equal(result.getSeconds(), 45, 'second')
})

test('adds through leap day', () => {
  const result = addCalendarDays(new Date(2024, 1, 28, 8, 5, 6), 1)
  equal(result.getFullYear(), 2024, 'year')
  equal(result.getMonth(), 1, 'month')
  equal(result.getDate(), 29, 'day')
})

test('rejects invalid day increments', () => {
  const base = new Date(2025, 0, 1, 12)
  for (const days of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    throws(() => addCalendarDays(base, days), `should reject ${String(days)}`)
  }
  throws(() => addCalendarDays(new Date(Number.NaN), 1), 'should reject invalid dates')
})

test('combines a date and time as local time', () => {
  const result = combineLocalDateAndTime('2025-07-09', '06:04')
  equal(result.getFullYear(), 2025, 'year')
  equal(result.getMonth(), 6, 'month')
  equal(result.getDate(), 9, 'day')
  equal(result.getHours(), 6, 'hour')
  equal(result.getMinutes(), 4, 'minute')
  equal(result.getSeconds(), 0, 'second')
  equal(result.getMilliseconds(), 0, 'millisecond')
})

test('rejects invalid calendar dates and times', () => {
  for (const [date, time] of [
    ['2025-02-29', '09:00'],
    ['2025-13-01', '09:00'],
    ['2025-01-01', '24:00'],
    ['2025-01-01', '12:60'],
    ['2025-1-01', '09:00'],
  ]) {
    throws(
      () => combineLocalDateAndTime(date, time),
      `should reject ${date} ${time}`,
    )
  }
})

test('returns integer Unix seconds rather than milliseconds', () => {
  const date = new Date(2025, 4, 6, 7, 8, 9, 987)
  equal(toUnixSeconds(date), Math.floor(date.getTime() / 1000), 'Unix seconds')
  assert(toUnixSeconds(date) < 10_000_000_000, 'timestamp should be second-sized')
})

test('rejects invalid timestamp dates', () => {
  throws(() => toUnixSeconds(new Date(Number.NaN)), 'should reject invalid dates')
})

test('requires a trimmed patient identifier', () => {
  equal(validatePatientIdentifier(''), 'required', 'empty identifier')
  equal(validatePatientIdentifier('   '), 'required', 'whitespace identifier')
  equal(validatePatientIdentifier('  P-001  '), null, 'trimmed identifier')
})

test('enforces the patient identifier length limit after trimming', () => {
  equal(
    validatePatientIdentifier('x'.repeat(MAX_PATIENT_IDENTIFIER_LENGTH)),
    null,
    'identifier at limit',
  )
  equal(
    validatePatientIdentifier(`  ${'x'.repeat(MAX_PATIENT_IDENTIFIER_LENGTH + 1)}  `),
    'too-long',
    'identifier over limit',
  )
})

test('allows an empty note and enforces its trimmed length limit', () => {
  equal(validateNote(''), null, 'empty note')
  equal(validateNote('   '), null, 'whitespace note')
  equal(validateNote('x'.repeat(MAX_NOTE_LENGTH)), null, 'note at limit')
  equal(
    validateNote(`  ${'x'.repeat(MAX_NOTE_LENGTH + 1)}  `),
    'too-long',
    'note over limit',
  )
})

test('accepts integer interval boundaries', () => {
  equal(validateIntervalDays(MIN_INTERVAL_DAYS), null, 'minimum interval')
  equal(validateIntervalDays(MAX_INTERVAL_DAYS), null, 'maximum interval')
})

test('rejects non-finite and non-integer intervals', () => {
  for (const days of [1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    equal(validateIntervalDays(days), 'not-integer', `invalid interval ${String(days)}`)
  }
})

test('rejects intervals outside the MVP range', () => {
  equal(validateIntervalDays(MIN_INTERVAL_DAYS - 1), 'out-of-range', 'below range')
  equal(validateIntervalDays(MAX_INTERVAL_DAYS + 1), 'out-of-range', 'above range')
})
