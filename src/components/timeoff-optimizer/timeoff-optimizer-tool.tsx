"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Sparkles } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { useHaptics } from "@/hooks/use-haptics"
import { OptimizerForm } from "./optimizer-form"
import { ResultsDisplay } from "./results-display"
import {
  fetchPublicHolidays,
  listCountries,
  listRegions,
  listStates,
} from "@/lib/timeoff-optimizer/holidays"
import { optimizeDaysAsync } from "@/lib/timeoff-optimizer/optimizer"
import type { DetectedGeo } from "@/lib/geo"
import type {
  CustomDayOff,
  Location,
  PlanResult,
  PlanStrategy,
  TakenDayOff,
} from "@/lib/timeoff-optimizer/types"

const STRATEGIES = [
  "balanced",
  "longWeekends",
  "miniBreaks",
  "weekLongBreaks",
  "extendedVacations",
] as const

function isStrategy(value: string | null): value is PlanStrategy {
  return value !== null && (STRATEGIES as readonly string[]).includes(value)
}

function makeLocationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

function base64EncodeJSON(value: unknown): string | null {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(value))
    let bin = ""
    for (const b of bytes) bin += String.fromCharCode(b)
    return btoa(bin)
  } catch {
    return null
  }
}

function base64DecodeJSON<T>(encoded: string | null): T | null {
  if (!encoded) return null
  try {
    const bin = atob(encoded)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return JSON.parse(new TextDecoder().decode(bytes)) as T
  } catch {
    return null
  }
}

function encodeLocations(locations: Location[]): string | null {
  const valid = locations.filter((l) => l.country)
  if (valid.length === 0) return null
  const compact = valid.map((l) => ({ c: l.country, s: l.state, r: l.region }))
  return base64EncodeJSON(compact)
}

interface CompactLocation {
  c?: unknown
  s?: unknown
  r?: unknown
}

function decodeLocations(encoded: string | null): Location[] {
  const parsed = base64DecodeJSON<CompactLocation[]>(encoded)
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter((e): e is CompactLocation => typeof e === "object" && e !== null)
    .map((e) => ({
      id: makeLocationId(),
      country: typeof e.c === "string" ? e.c : null,
      state: typeof e.s === "string" ? e.s : null,
      region: typeof e.r === "string" ? e.r : null,
    }))
}

function decodeCustomDays(encoded: string | null): CustomDayOff[] {
  const parsed = base64DecodeJSON<unknown>(encoded)
  return Array.isArray(parsed) ? (parsed as CustomDayOff[]) : []
}

function decodeTakenDays(encoded: string | null): TakenDayOff[] {
  const parsed = base64DecodeJSON<unknown>(encoded)
  return Array.isArray(parsed) ? (parsed as TakenDayOff[]) : []
}

function locationsEqual(a: Location[], b: Location[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].country !== b[i].country) return false
    if (a[i].state !== b[i].state) return false
    if (a[i].region !== b[i].region) return false
  }
  return true
}

function initialLocations(searchParams: URLSearchParams, detectedGeo?: DetectedGeo | null): Location[] {
  const fromLoc = decodeLocations(searchParams.get("loc"))
  if (fromLoc.length > 0) return fromLoc
  const legacyCountry = searchParams.get("country")
  if (legacyCountry) {
    return [
      {
        id: makeLocationId(),
        country: legacyCountry,
        state: searchParams.get("state"),
        region: searchParams.get("region"),
      },
    ]
  }
  if (detectedGeo?.country) {
    return [
      {
        id: makeLocationId(),
        country: detectedGeo.country,
        state: detectedGeo.region,
        region: null,
      },
    ]
  }
  return [{ id: makeLocationId(), country: null, state: null, region: null }]
}

interface TimeoffOptimizerToolProps {
  detectedGeo?: DetectedGeo | null
}

export function TimeoffOptimizerTool({ detectedGeo }: TimeoffOptimizerToolProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { trigger: hapticTrigger } = useHaptics()
  const currentYear = new Date().getFullYear()

  const initialYear = (() => {
    const y = parseInt(searchParams.get("year") ?? "", 10)
    return y === currentYear || y === currentYear + 1 ? y : currentYear
  })()
  const initialDays = (() => {
    const d = parseInt(searchParams.get("days") ?? "", 10)
    return Number.isFinite(d) ? Math.max(1, Math.min(60, d)) : 15
  })()
  const initialStrategyRaw = searchParams.get("strategy")
  const initialStrategy: PlanStrategy = isStrategy(initialStrategyRaw)
    ? initialStrategyRaw
    : "balanced"

  const [dayOffBudget, setDayOffBudget] = React.useState<number>(initialDays)
  const [year, setYear] = React.useState<number>(initialYear)
  const [strategy, setStrategy] = React.useState<PlanStrategy>(initialStrategy)
  const [locations, setLocations] = React.useState<Location[]>(() =>
    initialLocations(new URLSearchParams(searchParams.toString()), detectedGeo)
  )
  const [customDays, setCustomDays] = React.useState<CustomDayOff[]>(() =>
    decodeCustomDays(searchParams.get("cd"))
  )
  const [takenDays, setTakenDays] = React.useState<TakenDayOff[]>(() =>
    decodeTakenDays(searchParams.get("taken"))
  )

  const [countries, setCountries] = React.useState<
    Array<{ countryCode: string; name: string }>
  >([])
  const [countryStates, setCountryStates] = React.useState<
    Record<string, Array<{ code: string; name: string }>>
  >({})
  const [stateRegions, setStateRegions] = React.useState<
    Record<string, Array<{ code: string; name: string }>>
  >({})
  const [isLoadingCountries, setIsLoadingCountries] = React.useState(true)
  const [loadingStateCountries, setLoadingStateCountries] = React.useState<Set<string>>(
    new Set()
  )
  const [loadingRegionKeys, setLoadingRegionKeys] = React.useState<Set<string>>(new Set())

  const [isOptimizing, setIsOptimizing] = React.useState(false)
  const [result, setResult] = React.useState<PlanResult | null>(null)
  const [resultYear, setResultYear] = React.useState<number | null>(null)
  const [resultBudget, setResultBudget] = React.useState<number | null>(null)
  const [resultLocations, setResultLocations] = React.useState<Location[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const isStale =
    result !== null &&
    (resultYear !== year ||
      resultBudget !== dayOffBudget ||
      (resultLocations !== null && !locationsEqual(resultLocations, locations)))

  React.useEffect(() => {
    let cancelled = false
    listCountries()
      .then((list) => {
        if (cancelled) return
        list.sort((a, b) => a.name.localeCompare(b.name))
        setCountries(list)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingCountries(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    const wanted = new Set(
      locations.map((l) => l.country).filter((c): c is string => !!c)
    )
    wanted.forEach((country) => {
      if (country in countryStates) return
      if (loadingStateCountries.has(country)) return
      setLoadingStateCountries((prev) => {
        const next = new Set(prev)
        next.add(country)
        return next
      })
      listStates(country)
        .then((list) => {
          list.sort((a, b) => a.name.localeCompare(b.name))
          setCountryStates((prev) => ({ ...prev, [country]: list }))
        })
        .catch(() => {
          setCountryStates((prev) => ({ ...prev, [country]: [] }))
        })
        .finally(() => {
          setLoadingStateCountries((prev) => {
            const next = new Set(prev)
            next.delete(country)
            return next
          })
        })
    })
  }, [locations, countryStates, loadingStateCountries])

  React.useEffect(() => {
    const wanted = new Set(
      locations
        .filter((l) => l.country && l.state)
        .map((l) => `${l.country}|${l.state}`)
    )
    wanted.forEach((key) => {
      if (key in stateRegions) return
      if (loadingRegionKeys.has(key)) return
      const [country, state] = key.split("|")
      setLoadingRegionKeys((prev) => {
        const next = new Set(prev)
        next.add(key)
        return next
      })
      listRegions(country, state)
        .then((list) => {
          list.sort((a, b) => a.name.localeCompare(b.name))
          setStateRegions((prev) => ({ ...prev, [key]: list }))
        })
        .catch(() => {
          setStateRegions((prev) => ({ ...prev, [key]: [] }))
        })
        .finally(() => {
          setLoadingRegionKeys((prev) => {
            const next = new Set(prev)
            next.delete(key)
            return next
          })
        })
    })
  }, [locations, stateRegions, loadingRegionKeys])

  React.useEffect(() => {
    const params = new URLSearchParams()
    params.set("days", String(dayOffBudget))
    params.set("year", String(year))
    params.set("strategy", strategy)
    const locEncoded = encodeLocations(locations)
    if (locEncoded) params.set("loc", locEncoded)
    const customEncoded =
      customDays.length > 0 ? base64EncodeJSON(customDays) : null
    if (customEncoded) params.set("cd", customEncoded)
    const takenEncoded =
      takenDays.length > 0 ? base64EncodeJSON(takenDays) : null
    if (takenEncoded) params.set("taken", takenEncoded)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [dayOffBudget, year, strategy, locations, customDays, takenDays, router, pathname])

  const handleSubmit = async () => {
    const validLocations = locations.filter((l) => l.country)
    if (validLocations.length === 0) return
    setIsOptimizing(true)
    setError(null)
    try {
      const holidayLists = await Promise.all(
        validLocations.map((l) =>
          fetchPublicHolidays(year, {
            country: l.country!,
            state: l.state ?? undefined,
            region: l.region ?? undefined,
          })
        )
      )
      const seen = new Set<string>()
      const holidays: Array<{ date: string; name: string }> = []
      for (const list of holidayLists) {
        for (const h of list) {
          const key = `${h.date}|${h.name}`
          if (seen.has(key)) continue
          seen.add(key)
          holidays.push(h)
        }
      }
      const filteredCustomDays = customDays.filter((d) =>
        d.isRecurring ? d.startDate && d.endDate : d.date
      )
      const filteredTakenDays = takenDays.filter((d) =>
        d.startDate && d.endDate ? true : !!d.date
      )
      const optimized = await optimizeDaysAsync({
        dayOffBudget,
        strategy,
        year,
        holidays,
        customDaysOff: filteredCustomDays,
        takenDaysOff: filteredTakenDays,
      })
      setResult(optimized)
      setResultYear(year)
      setResultBudget(dayOffBudget)
      setResultLocations(locations.map((l) => ({ ...l })))
      hapticTrigger("success")
    } catch (err) {
      console.error(err)
      setError("Something went wrong while optimizing. Please try again.")
      hapticTrigger("error")
    } finally {
      setIsOptimizing(false)
    }
  }

  const shareUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}${pathname}?${searchParams.toString()}`

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <OptimizerForm
        dayOffBudget={dayOffBudget}
        onDayOffBudgetChange={setDayOffBudget}
        year={year}
        onYearChange={setYear}
        strategy={strategy}
        onStrategyChange={setStrategy}
        locations={locations}
        onLocationsChange={setLocations}
        countries={countries}
        countryStates={countryStates}
        stateRegions={stateRegions}
        isLoadingCountries={isLoadingCountries}
        loadingStateCountries={loadingStateCountries}
        loadingRegionKeys={loadingRegionKeys}
        customDays={customDays}
        onCustomDaysChange={setCustomDays}
        takenDays={takenDays}
        onTakenDaysChange={setTakenDays}
        detectedLocation={
          detectedGeo?.country
            ? [detectedGeo.country, detectedGeo.region].filter(Boolean).join(" / ")
            : null
        }
        isOptimizing={isOptimizing}
        onSubmit={handleSubmit}
      />

      <div className="space-y-4">
        {error && (
          <Card>
            <CardContent className="px-4 text-xs text-destructive">{error}</CardContent>
          </Card>
        )}

        {result ? (
          <ResultsDisplay
            result={result}
            year={resultYear ?? year}
            ptoBudget={resultBudget ?? dayOffBudget}
            shareUrl={shareUrl}
            isStale={isStale}
          />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="size-6 text-primary" />
              </span>
              <h2 className="text-sm font-semibold">Plan your perfect year</h2>
              <p className="max-w-sm text-xs text-muted-foreground">
                Pick how many days you have, where you live, and a strategy. We&rsquo;ll line up your
                PTO with weekends and holidays to maximize your time off.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
