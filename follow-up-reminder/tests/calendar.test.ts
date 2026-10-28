import {
  buildCalendarRequest,
  createCalendarService,
  type CalendarRequest,
  type WxCalendarAdapter,
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

function createAdapter(
  outcome: 'success' | 'denied' | 'failed' = 'success',
): {
  adapter: WxCalendarAdapter
  calls: CalendarRequest[]
} {
  const calls: CalendarRequest[] = []
  return {
    calls,
    adapter: {
      canIUse: () => true,
      addPhoneCalendar(options) {
        const { success: _success, fail: _fail, ...request } = options
        calls.push(request)
        if (outcome === 'success') {
          options.success()
        } else if (outcome === 'denied') {
          options.fail({ errMsg: 'addPhoneCalendar:fail auth deny' })
        } else {
          options.fail({ errMsg: 'addPhoneCalendar:fail system error' })
        }
      },
    },
  }
}

test('builds a minimal calendar request with Unix seconds and an immediate alarm', () => {
  const start = new Date(2025, 6, 9, 8, 30, 45, 987)
  const request = buildCalendarRequest({
    patientIdentifier: '  P-001  ',
    note: '  请电话确认  ',
    start,
  })

  equal(request.title, '回访提醒：P-001', 'title')
  equal(request.description, '请电话确认\n创建后请前往系统日历修改或删除。', 'description')
  equal(request.startTime, Math.floor(start.getTime() / 1000), 'start time')
  equal(request.alarm, true, 'alarm')
  equal(request.alarmOffset, 0, 'alarm offset')
  equal(Object.keys(request).sort().join(','), 'alarm,alarmOffset,description,startTime,title', 'minimal fields')
})

test('omits empty notes from the calendar description', () => {
  const request = buildCalendarRequest({
    patientIdentifier: 'A12',
    note: '   ',
    start: new Date(2025, 0, 1, 9),
  })

  equal(request.description, '创建后请前往系统日历修改或删除。', 'description')
})

test('reports unsupported capability without calling addPhoneCalendar', async () => {
  let calls = 0
  const service = createCalendarService({
    canIUse: () => false,
    addPhoneCalendar: () => {
      calls += 1
    },
  })

  const result = await service.add({
    title: '回访提醒：A12',
    description: '说明',
    startTime: 1,
    alarm: true,
    alarmOffset: 0,
  })

  equal(result.status, 'unsupported', 'status')
  equal(calls, 0, 'calendar calls')
})

test('reports calendar success', async () => {
  const { adapter } = createAdapter('success')
  const service = createCalendarService(adapter)
  const result = await service.add({
    title: '回访提醒：A12',
    description: '说明',
    startTime: 1,
    alarm: true,
    alarmOffset: 0,
  })

  equal(result.status, 'success', 'status')
})

test('classifies permission denial separately', async () => {
  const { adapter } = createAdapter('denied')
  const service = createCalendarService(adapter)
  const result = await service.add({
    title: '回访提醒：A12',
    description: '说明',
    startTime: 1,
    alarm: true,
    alarmOffset: 0,
  })

  equal(result.status, 'permission-denied', 'status')
})

test('classifies the official auth denied variant as permission denial', async () => {
  const service = createCalendarService({
    canIUse: () => true,
    addPhoneCalendar(options) {
      options.fail({ errMsg: 'addPhoneCalendar:fail auth denied' })
    },
  })
  const result = await service.add({
    title: '回访提醒：A12',
    description: '说明',
    startTime: 1,
    alarm: true,
    alarmOffset: 0,
  })

  equal(result.status, 'permission-denied', 'status')
})

test('classifies known device authorization refusal messages', async () => {
  for (const errMsg of [
    'addPhoneCalendar:fail jsapi user authorize denied',
    'addPhoneCalendar:fail authorization refused',
  ]) {
    const service = createCalendarService({
      canIUse: () => true,
      addPhoneCalendar(options) {
        options.fail({ errMsg })
      },
    })

    equal(
      (await service.add({
        title: '回访提醒：A12',
        description: '说明',
        startTime: 1,
        alarm: true,
        alarmOffset: 0,
      })).status,
      'permission-denied',
      errMsg,
    )
  }
})

test('preserves errMsg and errno without guessing unknown numeric codes', async () => {
  const service = createCalendarService({
    canIUse: () => true,
    addPhoneCalendar(options) {
      options.fail({
        errMsg: 'addPhoneCalendar:fail calendar database denied write',
        errno: 99999,
      })
    },
  })

  const result = await service.add({
    title: '回访提醒：A12',
    description: '说明',
    startTime: 1,
    alarm: true,
    alarmOffset: 0,
  })

  equal(result.status, 'failed', 'status')
  assert(result.status === 'failed', 'failure should retain its source error')
  equal(result.error.errMsg, 'addPhoneCalendar:fail calendar database denied write', 'errMsg')
  equal(result.error.errno, 99999, 'errno')
})

test('reports an ordinary calendar failure', async () => {
  const { adapter } = createAdapter('failed')
  const service = createCalendarService(adapter)
  const result = await service.add({
    title: '回访提醒：A12',
    description: '说明',
    startTime: 1,
    alarm: true,
    alarmOffset: 0,
  })

  equal(result.status, 'failed', 'status')
})

test('rejects a rapid duplicate while the first calendar call is pending', async () => {
  let finishFirst: (() => void) | undefined
  let calls = 0
  const service = createCalendarService({
    canIUse: () => true,
    addPhoneCalendar(options) {
      calls += 1
      finishFirst = options.success
    },
  })
  const request: CalendarRequest = {
    title: '回访提醒：A12',
    description: '说明',
    startTime: 1,
    alarm: true,
    alarmOffset: 0,
  }

  const first = service.add(request)
  const duplicate = await service.add(request)

  equal(duplicate.status, 'busy', 'duplicate status')
  equal(calls, 1, 'calendar calls')
  assert(finishFirst !== undefined, 'first request should be pending')
  finishFirst()
  equal((await first).status, 'success', 'first status')
})

test('settles only once when an old request invokes both callbacks', async () => {
  const callbacks: Array<{
    success: () => void
    fail: (error: { errMsg?: string }) => void
  }> = []
  const service = createCalendarService({
    canIUse: () => true,
    addPhoneCalendar(options) {
      callbacks.push(options)
    },
  })
  const request: CalendarRequest = {
    title: '回访提醒：A12',
    description: '说明',
    startTime: 1,
    alarm: true,
    alarmOffset: 0,
  }

  const first = service.add(request)
  callbacks[0].success()
  equal((await first).status, 'success', 'first result')

  const second = service.add(request)
  callbacks[0].fail({ errMsg: 'addPhoneCalendar:fail system error' })
  equal((await service.add(request)).status, 'busy', 'stale callback must not release second')
  equal(callbacks.length, 2, 'calendar calls')
  callbacks[1].success()
  equal((await second).status, 'success', 'second result')
})
