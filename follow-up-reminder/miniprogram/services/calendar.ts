export interface CalendarRequest {
  title: string
  description: string
  startTime: number
  alarm: true
  alarmOffset: 0
}

export interface WxCalendarError {
  errMsg?: string
  errno?: number
}

interface CalendarCallbacks {
  success: () => void
  fail: (error: WxCalendarError) => void
}

export interface WxCalendarAdapter {
  canIUse(api: string): boolean
  addPhoneCalendar(options: CalendarRequest & CalendarCallbacks): void
}

export type CalendarResult =
  | { status: 'success' }
  | { status: 'unsupported' }
  | { status: 'permission-denied'; error: WxCalendarError }
  | { status: 'failed'; error: WxCalendarError }
  | { status: 'busy' }

export interface CalendarService {
  add(request: CalendarRequest): Promise<CalendarResult>
}

const CALENDAR_DESCRIPTION_SUFFIX = '创建后请前往系统日历修改或删除。'

function isPermissionDenied(error: WxCalendarError): boolean {
  const message = (error.errMsg ?? '').toLowerCase()
  return (
    message.includes('auth deny') ||
    message.includes('auth denied') ||
    message.includes('permission denied') ||
    message.includes('authorize no response') ||
    message.includes('jsapi user authorize denied') ||
    message.includes('authorization refused')
  )
}

function errorFromThrown(error: unknown): WxCalendarError {
  if (error instanceof Error) {
    return { errMsg: error.message }
  }
  return { errMsg: String(error) }
}

export function buildCalendarRequest(input: {
  patientIdentifier: string
  note: string
  start: Date
}): CalendarRequest {
  const patientIdentifier = input.patientIdentifier.trim()
  const note = input.note.trim()
  return {
    title: `回访提醒：${patientIdentifier}`,
    description: note
      ? `${note}\n${CALENDAR_DESCRIPTION_SUFFIX}`
      : CALENDAR_DESCRIPTION_SUFFIX,
    startTime: Math.floor(input.start.getTime() / 1000),
    alarm: true,
    alarmOffset: 0,
  }
}

export function createCalendarService(adapter: WxCalendarAdapter): CalendarService {
  let adding = false

  return {
    add(request) {
      if (adding) {
        return Promise.resolve({ status: 'busy' })
      }
      if (!adapter.canIUse('addPhoneCalendar')) {
        return Promise.resolve({ status: 'unsupported' })
      }

      adding = true
      return new Promise<CalendarResult>((resolve) => {
        let settled = false
        const finish = (result: CalendarResult): void => {
          if (settled) {
            return
          }
          settled = true
          adding = false
          resolve(result)
        }

        try {
          adapter.addPhoneCalendar({
            ...request,
            success: () => finish({ status: 'success' }),
            fail: (error) =>
              finish({
                status: isPermissionDenied(error) ? 'permission-denied' : 'failed',
                error,
              }),
          })
        } catch (error) {
          finish({ status: 'failed', error: errorFromThrown(error) })
        }
      })
    },
  }
}
