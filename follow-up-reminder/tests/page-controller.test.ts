import {
  createReminderPageController,
  getIntervalPickerState,
  type ReminderPageController,
} from '../miniprogram/pages/index/controller'
import type {
  CalendarRequest,
  CalendarResult,
  CalendarService,
} from '../miniprogram/services/calendar'

declare const require: (id: 'node:test') => {
  test: (name: string, action: () => void | Promise<void>) => void
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

const NOW = new Date(2025, 0, 1, 12)

function validController(
  calendar: CalendarService,
): ReminderPageController {
  const controller = createReminderPageController({
    calendar,
    now: () => new Date(NOW.getTime()),
  })
  controller.updateForm({ patientIdentifier: 'P-001', note: '电话确认' })
  return controller
}

test('invalid submission does not call the calendar service', async () => {
  let calls = 0
  const controller = createReminderPageController({
    calendar: {
      add: async () => {
        calls += 1
        return { status: 'success' }
      },
    },
    now: () => new Date(NOW.getTime()),
  })

  const result = await controller.submit()

  equal(result.status, 'invalid', 'status')
  equal(calls, 0, 'calendar calls')
  equal(controller.state.isAdding, false, 'adding state')
})

test('past submission is rejected with a clear reason and no calendar call', async () => {
  let calls = 0
  const controller = validController({
    add: async () => {
      calls += 1
      return { status: 'success' }
    },
  })
  controller.updateForm({
    reminderDate: '2025-01-01',
    reminderTime: '12:00',
  })

  const result = await controller.submit()

  equal(result.status, 'invalid', 'status')
  assert(result.status === 'invalid', 'result should include an invalid reason')
  equal(result.reason, 'not-future', 'reason')
  equal(calls, 0, 'calendar calls')
})

test('successful submission resets sensitive values to safe defaults', async () => {
  const controller = validController({
    add: async () => ({ status: 'success' }),
  })

  const result = await controller.submit()

  equal(result.status, 'success', 'status')
  equal(controller.state.form.patientIdentifier, '', 'patient identifier')
  equal(controller.state.form.note, '', 'note')
  equal(controller.state.form.intervalDays, '30', 'interval')
  equal(controller.state.form.reminderDate, '2025-01-31', 'date')
  equal(controller.state.isAdding, false, 'adding state')
})

test('failed submission preserves the form for retry', async () => {
  const controller = validController({
    add: async () => ({ status: 'failed', error: { errMsg: 'system error' } }),
  })
  const originalForm = { ...controller.state.form }

  const result = await controller.submit()

  equal(result.status, 'failed', 'status')
  equal(JSON.stringify(controller.state.form), JSON.stringify(originalForm), 'form')
  equal(controller.state.isAdding, false, 'adding state')
})

test('changing a valid interval recalculates the reminder date', () => {
  const controller = createReminderPageController({
    calendar: { add: async () => ({ status: 'success' }) },
    now: () => new Date(NOW.getTime()),
  })

  controller.updateInterval('14')

  equal(controller.state.form.intervalDays, '14', 'interval')
  equal(controller.state.form.reminderDate, '2025-01-15', 'date')
})

test('custom interval display does not fall back to the 30-day label', () => {
  const picker = getIntervalPickerState('45')

  equal(picker.label, '自定义 45 天', 'label')
  equal(picker.selectedIndex, 2, 'safe selector index')
})

test('rapid duplicate submission calls the calendar service once', async () => {
  let resolveFirst: ((result: CalendarResult) => void) | undefined
  const requests: CalendarRequest[] = []
  const controller = validController({
    add(request) {
      requests.push(request)
      return new Promise((resolve) => {
        resolveFirst = resolve
      })
    },
  })

  const first = controller.submit()
  const duplicate = await controller.submit()

  equal(duplicate.status, 'busy', 'duplicate status')
  equal(requests.length, 1, 'calendar calls')
  assert(resolveFirst !== undefined, 'first call should be pending')
  resolveFirst({ status: 'failed', error: { errMsg: 'system error' } })
  equal((await first).status, 'failed', 'first result')
})
