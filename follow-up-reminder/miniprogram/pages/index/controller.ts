import type {
  CalendarResult,
  CalendarService,
} from '../../services/calendar'
import { buildCalendarRequest } from '../../services/calendar'
import {
  createInitialForm,
  getFormValidation,
  updateDateForInterval,
  type FormValidationError,
  type ReminderForm,
} from '../../utils/form'

export const COMMON_INTERVALS = ['7', '14', '30', '60', '90']

export interface IntervalPickerState {
  selectedIndex: number
  label: string
}

export function getIntervalPickerState(intervalDays: string): IntervalPickerState {
  const selectedIndex = COMMON_INTERVALS.indexOf(intervalDays)
  if (selectedIndex >= 0) {
    return { selectedIndex, label: `常用：${intervalDays} 天` }
  }
  return {
    selectedIndex: COMMON_INTERVALS.indexOf('30'),
    label: /^\d+$/.test(intervalDays) ? `自定义 ${intervalDays} 天` : '自定义输入',
  }
}

export interface ReminderPageState {
  form: ReminderForm
  isValid: boolean
  isAdding: boolean
}

export type PageSubmitResult =
  | CalendarResult
  | { status: 'invalid'; reason: FormValidationError }

export interface ReminderPageController {
  readonly state: ReminderPageState
  updateForm(patch: Partial<ReminderForm>): void
  updateInterval(intervalDays: string): void
  reset(): void
  submit(): Promise<PageSubmitResult>
}

export function createReminderPageController(options: {
  calendar: CalendarService
  now: () => Date
}): ReminderPageController {
  let state: ReminderPageState = {
    form: createInitialForm(options.now()),
    isValid: false,
    isAdding: false,
  }

  const refreshValidity = (): void => {
    state.isValid = getFormValidation(state.form, options.now()).isValid
  }

  const reset = (): void => {
    state = {
      form: createInitialForm(options.now()),
      isValid: false,
      isAdding: false,
    }
  }

  return {
    get state() {
      return state
    },

    updateForm(patch) {
      state.form = { ...state.form, ...patch }
      refreshValidity()
    },

    updateInterval(intervalDays) {
      const reminderDate = updateDateForInterval(options.now(), intervalDays)
      state.form = {
        ...state.form,
        intervalDays,
        ...(reminderDate === null ? {} : { reminderDate }),
      }
      refreshValidity()
    },

    reset,

    submit() {
      if (state.isAdding) {
        return Promise.resolve({ status: 'busy' })
      }

      const validation = getFormValidation(state.form, options.now())
      if (!validation.isValid || validation.start === null) {
        state.isValid = false
        return Promise.resolve({
          status: 'invalid',
          reason: validation.error ?? 'invalid-fields',
        })
      }

      state.isAdding = true
      const request = buildCalendarRequest({
        patientIdentifier: state.form.patientIdentifier,
        note: state.form.note,
        start: validation.start,
      })

      // CalendarService.add invokes the wx adapter synchronously in this call stack.
      return options.calendar.add(request).then((result) => {
        if (result.status === 'success') {
          reset()
        } else {
          state.isAdding = false
        }
        return result
      })
    },
  }
}
