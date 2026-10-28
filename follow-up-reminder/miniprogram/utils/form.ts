import {
  DEFAULT_INTERVAL_DAYS,
  addCalendarDays,
  combineLocalDateAndTime,
  validateIntervalDays,
  validateNote,
  validatePatientIdentifier,
} from './reminder'

export interface ReminderForm {
  patientIdentifier: string
  intervalDays: string
  reminderDate: string
  reminderTime: string
  note: string
}

export interface FormValidation {
  isValid: boolean
  start: Date | null
  error: FormValidationError | null
}

export type FormValidationError = 'invalid-fields' | 'not-future'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseInterval(intervalText: string): number | null {
  if (!/^\d+$/.test(intervalText.trim())) {
    return null
  }
  const value = Number(intervalText)
  return validateIntervalDays(value) === null ? value : null
}

export function createInitialForm(today: Date): ReminderForm {
  return {
    patientIdentifier: '',
    intervalDays: String(DEFAULT_INTERVAL_DAYS),
    reminderDate: formatLocalDate(addCalendarDays(today, DEFAULT_INTERVAL_DAYS)),
    reminderTime: '09:00',
    note: '',
  }
}

export function updateDateForInterval(today: Date, intervalText: string): string | null {
  const interval = parseInterval(intervalText)
  return interval === null ? null : formatLocalDate(addCalendarDays(today, interval))
}

export function getFormValidation(form: ReminderForm, now?: Date): FormValidation {
  const fieldsAreValid =
    validatePatientIdentifier(form.patientIdentifier) === null &&
    parseInterval(form.intervalDays) !== null &&
    validateNote(form.note) === null

  if (!fieldsAreValid) {
    return { isValid: false, start: null, error: 'invalid-fields' }
  }

  try {
    const start = combineLocalDateAndTime(form.reminderDate, form.reminderTime)
    if (now !== undefined && start.getTime() <= now.getTime()) {
      return { isValid: false, start, error: 'not-future' }
    }
    return {
      isValid: true,
      start,
      error: null,
    }
  } catch {
    return { isValid: false, start: null, error: 'invalid-fields' }
  }
}
