export type PlanStrategy =
  | "balanced"
  | "miniBreaks"
  | "longWeekends"
  | "weekLongBreaks"
  | "extendedVacations"
  | "custom"

export interface CustomStrategy {
  minLen: number
  maxLen: number
  spacing: number
}

export interface DayPlan {
  date: string
  isWeekend: boolean
  isDayOff: boolean
  inOffBlock: boolean
  isPublicHoliday: boolean
  holidayName?: string
  isCustomDayOff: boolean
  customDayName?: string
  isAlreadyTaken: boolean
  takenName?: string
  takenPtoCost?: number
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
  totalTakenDays: number
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

export interface TakenDayOff {
  name: string
  date?: string
  startDate?: string
  endDate?: string
  startTime?: string  // "HH:MM", only for single-date entries
  endTime?: string    // "HH:MM", only for single-date entries
}

export interface PlanInputs {
  dayOffBudget: number
  strategy?: PlanStrategy
  customStrategy?: CustomStrategy
  year?: number
  holidays?: Array<{ date: string; name: string }>
  customDaysOff?: Array<CustomDayOff>
  takenDaysOff?: Array<TakenDayOff>
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
