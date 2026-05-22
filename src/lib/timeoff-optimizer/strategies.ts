import type { PlanStrategy } from "./types"

export interface StrategyOption {
  id: PlanStrategy
  label: string
  description: string
  recommendedFor: string
}

export const STRATEGIES: StrategyOption[] = [
  {
    id: "balanced",
    label: "Balanced",
    description: "Mix of short and long breaks throughout the year.",
    recommendedFor: "Best for most people who want a healthy spread.",
  },
  {
    id: "longWeekends",
    label: "Long Weekends",
    description: "Many 3 to 4 day breaks, spaced about a week apart.",
    recommendedFor: "Best for frequent short escapes.",
  },
  {
    id: "miniBreaks",
    label: "Mini Breaks",
    description: "Several 5 to 6 day breaks, spaced about 2 weeks apart.",
    recommendedFor: "Best for quick getaways without burning a full week.",
  },
  {
    id: "weekLongBreaks",
    label: "Week-Long Breaks",
    description: "Full weeks off, spaced about 3 weeks apart.",
    recommendedFor: "Best for recharging with proper time off.",
  },
  {
    id: "extendedVacations",
    label: "Extended Vacations",
    description: "Long 10 to 15 day trips, spaced a month apart.",
    recommendedFor: "Best for major trips and deep rest.",
  },
]
