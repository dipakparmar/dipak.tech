export type PlanStrategy =
  | "balanced"
  | "miniBreaks"
  | "longWeekends"
  | "weekLongBreaks"
  | "extendedVacations"

export interface DayPlan {
  date: string
  isWeekend: boolean
  isDayOff: boolean
  inOffBlock: boolean
  isPublicHoliday: boolean
  holidayName?: string
  isCustomDayOff: boolean
  customDayName?: string
}

export interface OffBlock {
  startDate: string
  endDate: string
  days: DayPlan[]
  totalDays: number
  dayOffCount: number
  holidayCount: number
  weekendCount: number
  customDayCount: number
}

export interface PlanSummary {
  totalDayOffs: number
  totalHolidays: number
  totalWeekendDays: number
  totalCustomDays: number
  totalDaysOff: number
}

export interface PlanResult {
  days: DayPlan[]
  breaks: OffBlock[]
  stats: PlanSummary
}

export interface CustomDayOff {
  date?: string
  name: string
  isRecurring?: boolean
  startDate?: string
  endDate?: string
  weekday?: number
}

export interface PlanInputs {
  dayOffBudget: number
  strategy?: PlanStrategy
  year?: number
  holidays?: Array<{ date: string; name: string }>
  customDaysOff?: Array<CustomDayOff>
}

export interface CountryInfo {
  country: string
  state?: string
  region?: string
}

export interface Location {
  id: string
  country: string | null
  state: string | null
  region: string | null
}
