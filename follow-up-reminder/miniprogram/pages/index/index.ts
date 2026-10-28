import { createCalendarService } from '../../services/calendar'
import {
  COMMON_INTERVALS,
  createReminderPageController,
  getIntervalPickerState,
  type PageSubmitResult,
} from './controller'
import type { ReminderForm } from '../../utils/form'
import {
  MAX_INTERVAL_DAYS,
  MAX_NOTE_LENGTH,
  MAX_PATIENT_IDENTIFIER_LENGTH,
  MIN_INTERVAL_DAYS,
} from '../../utils/reminder'

const calendarService = createCalendarService({
  canIUse: (api) => wx.canIUse(api),
  addPhoneCalendar: (options) => wx.addPhoneCalendar(options),
})
const controller = createReminderPageController({
  calendar: calendarService,
  now: () => new Date(),
})

interface PageData {
  form: ReminderForm
  commonIntervals: string[]
  selectedIntervalIndex: number
  intervalPickerLabel: string
  isValid: boolean
  isAdding: boolean
  minInterval: number
  maxInterval: number
  maxPatientLength: number
  maxNoteLength: number
}

function valueFromEvent(event: { detail: { value: string } }): string {
  return String(event.detail.value)
}

Page<PageData, WechatMiniprogram.IAnyObject>({
  data: {
    form: controller.state.form,
    commonIntervals: COMMON_INTERVALS,
    selectedIntervalIndex: getIntervalPickerState('30').selectedIndex,
    intervalPickerLabel: getIntervalPickerState('30').label,
    isValid: false,
    isAdding: false,
    minInterval: MIN_INTERVAL_DAYS,
    maxInterval: MAX_INTERVAL_DAYS,
    maxPatientLength: MAX_PATIENT_IDENTIFIER_LENGTH,
    maxNoteLength: MAX_NOTE_LENGTH,
  },

  onLoad() {
    this.resetForm()
  },

  resetForm() {
    controller.reset()
    this.syncControllerState()
  },

  syncControllerState() {
    const { form, isValid, isAdding } = controller.state
    const picker = getIntervalPickerState(form.intervalDays)
    this.setData({
      form,
      selectedIntervalIndex: picker.selectedIndex,
      intervalPickerLabel: picker.label,
      isValid,
      isAdding,
    })
  },

  onPatientInput(event: { detail: { value: string } }) {
    controller.updateForm({ patientIdentifier: valueFromEvent(event) })
    this.syncControllerState()
  },

  onIntervalPick(event: { detail: { value: string } }) {
    const selectedIntervalIndex = Number(valueFromEvent(event))
    const intervalDays =
      this.data.commonIntervals[selectedIntervalIndex] ?? this.data.form.intervalDays
    controller.updateInterval(intervalDays)
    this.syncControllerState()
  },

  onIntervalInput(event: { detail: { value: string } }) {
    controller.updateInterval(valueFromEvent(event))
    this.syncControllerState()
  },

  onDateChange(event: { detail: { value: string } }) {
    controller.updateForm({ reminderDate: valueFromEvent(event) })
    this.syncControllerState()
  },

  onTimeChange(event: { detail: { value: string } }) {
    controller.updateForm({ reminderTime: valueFromEvent(event) })
    this.syncControllerState()
  },

  onNoteInput(event: { detail: { value: string } }) {
    controller.updateForm({ note: valueFromEvent(event) })
    this.syncControllerState()
  },

  handleCalendarResult(result: PageSubmitResult) {
    this.syncControllerState()
    if (result.status === 'invalid') {
      wx.showToast({
        title:
          result.reason === 'not-future'
            ? '回访时间必须晚于当前时间'
            : '请检查表单内容',
        icon: 'none',
      })
      return
    }
    if (result.status === 'success') {
      wx.showToast({ title: '已添加到系统日历', icon: 'success' })
      return
    }

    if (result.status === 'permission-denied') {
      wx.showModal({
        title: '需要日历权限',
        content: '请在设置中允许日历权限，然后返回重试。不会自动重复申请。',
        confirmText: '打开设置',
        success: (modalResult) => {
          if (modalResult.confirm) {
            wx.openSetting()
          }
        },
      })
      return
    }
    if (result.status === 'unsupported') {
      wx.showModal({
        title: '当前环境不支持',
        content: '当前微信版本或设备不支持添加系统日历，请升级微信后重试。',
        showCancel: false,
      })
      return
    }
    if (result.status === 'failed') {
      wx.showToast({ title: '添加失败，请稍后重试', icon: 'none' })
    }
  },

  onSubmit() {
    // submit() reaches wx.addPhoneCalendar synchronously before returning.
    const result = controller.submit()
    this.syncControllerState()
    result.then((calendarResult) => this.handleCalendarResult(calendarResult))
  },
})
