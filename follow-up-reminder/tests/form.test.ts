import {
  createInitialForm,
  getFormValidation,
  updateDateForInterval,
} from '../miniprogram/utils/form'

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

test('creates safe defaults with a 30-day date and no patient data', () => {
  const form = createInitialForm(new Date(2025, 0, 31, 14, 20))

  equal(form.patientIdentifier, '', 'patient identifier')
  equal(form.intervalDays, '30', 'interval')
  equal(form.reminderDate, '2025-03-02', 'reminder date')
  equal(form.reminderTime, '09:00', 'reminder time')
  equal(form.note, '', 'note')
})

test('recalculates the date when a valid interval changes', () => {
  equal(
    updateDateForInterval(new Date(2025, 11, 20), '14'),
    '2026-01-03',
    'calculated date',
  )
})

test('does not calculate a date for an invalid interval', () => {
  equal(updateDateForInterval(new Date(2025, 0, 1), '0'), null, 'zero interval')
  equal(updateDateForInterval(new Date(2025, 0, 1), '1.5'), null, 'fractional interval')
  equal(updateDateForInterval(new Date(2025, 0, 1), 'abc'), null, 'text interval')
})

test('accepts a complete valid form and returns its start date', () => {
  const validation = getFormValidation({
    patientIdentifier: '  P-001  ',
    intervalDays: '30',
    reminderDate: '2025-07-09',
    reminderTime: '08:30',
    note: '  电话回访  ',
  })

  equal(validation.isValid, true, 'validity')
  assert(validation.start !== null, 'start should be available')
  equal(validation.start.getFullYear(), 2025, 'year')
  equal(validation.start.getMonth(), 6, 'month')
  equal(validation.start.getDate(), 9, 'day')
  equal(validation.start.getHours(), 8, 'hour')
  equal(validation.start.getMinutes(), 30, 'minute')
})

test('requires the reminder time to be strictly later than injected now', () => {
  const form = {
    patientIdentifier: 'P-001',
    intervalDays: '30',
    reminderDate: '2025-07-09',
    reminderTime: '08:30',
    note: '',
  }

  const equalNow = getFormValidation(form, new Date(2025, 6, 9, 8, 30))
  const past = getFormValidation(form, new Date(2025, 6, 9, 8, 31))
  const future = getFormValidation(form, new Date(2025, 6, 9, 8, 29))

  equal(equalNow.isValid, false, 'equal-now validity')
  equal(equalNow.error, 'not-future', 'equal-now error')
  equal(past.isValid, false, 'past validity')
  equal(past.error, 'not-future', 'past error')
  equal(future.isValid, true, 'future validity')
  equal(future.error, null, 'future error')
})

test('rejects invalid patient, interval, date, time, or note fields', () => {
  const base = {
    patientIdentifier: 'P-001',
    intervalDays: '30',
    reminderDate: '2025-07-09',
    reminderTime: '08:30',
    note: '',
  }
  const invalidForms = [
    { ...base, patientIdentifier: ' ' },
    { ...base, intervalDays: '366' },
    { ...base, intervalDays: '1.5' },
    { ...base, reminderDate: '2025-02-29' },
    { ...base, reminderTime: '24:00' },
    { ...base, note: 'x'.repeat(501) },
  ]

  for (const form of invalidForms) {
    equal(getFormValidation(form).isValid, false, JSON.stringify(form))
  }
})
