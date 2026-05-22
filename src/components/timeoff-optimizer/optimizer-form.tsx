"use client"

import * as React from "react"
import { CalendarPlus, MapPin, Trash2, Wand2 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  HapticButton,
  HapticSelectItem as SelectItem,
  HapticSlider as Slider,
} from "@/components/haptic-wrappers"
import { DatePicker } from "@/components/ui/date-picker"
import { Spinner } from "@/components/ui/spinner"
import { LocationRow } from "./location-row"
import { STRATEGIES } from "@/lib/timeoff-optimizer/strategies"
import type {
  CustomDayOff,
  Location,
  PlanStrategy,
} from "@/lib/timeoff-optimizer/types"

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

export interface OptimizerFormProps {
  dayOffBudget: number
  onDayOffBudgetChange: (value: number) => void
  year: number
  onYearChange: (year: number) => void
  strategy: PlanStrategy
  onStrategyChange: (strategy: PlanStrategy) => void

  locations: Location[]
  onLocationsChange: (locations: Location[]) => void
  countries: Array<{ countryCode: string; name: string }>
  countryStates: Record<string, Array<{ code: string; name: string }>>
  stateRegions: Record<string, Array<{ code: string; name: string }>>
  isLoadingCountries: boolean
  loadingStateCountries: Set<string>
  loadingRegionKeys: Set<string>

  customDays: CustomDayOff[]
  onCustomDaysChange: (days: CustomDayOff[]) => void

  isOptimizing: boolean
  onSubmit: () => void
}

function makeLocationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

export function OptimizerForm(props: OptimizerFormProps) {
  const {
    dayOffBudget,
    onDayOffBudgetChange,
    year,
    onYearChange,
    strategy,
    onStrategyChange,
    locations,
    onLocationsChange,
    countries,
    countryStates,
    stateRegions,
    isLoadingCountries,
    loadingStateCountries,
    loadingRegionKeys,
    customDays,
    onCustomDaysChange,
    isOptimizing,
    onSubmit,
  } = props

  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear, currentYear + 1]
  const strategyDetail = STRATEGIES.find((s) => s.id === strategy)

  const handleSliderChange = (vals: number[]) => onDayOffBudgetChange(vals[0])
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseInt(e.target.value, 10)
    if (Number.isFinite(n)) onDayOffBudgetChange(Math.max(1, Math.min(60, n)))
  }

  const updateLocation = (id: string, patch: Partial<Omit<Location, "id">>) => {
    onLocationsChange(locations.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }
  const removeLocation = (id: string) => {
    onLocationsChange(locations.filter((l) => l.id !== id))
  }
  const addLocation = () => {
    onLocationsChange([
      ...locations,
      { id: makeLocationId(), country: null, state: null, region: null },
    ])
  }

  const addCustomDate = () =>
    onCustomDaysChange([...customDays, { name: "Company day off", date: "" }])
  const addCustomRecurring = () =>
    onCustomDaysChange([
      ...customDays,
      {
        name: "Recurring day off",
        isRecurring: true,
        weekday: 5,
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      },
    ])
  const updateCustomDay = (idx: number, patch: Partial<CustomDayOff>) => {
    onCustomDaysChange(
      customDays.map((d, i) => (i === idx ? { ...d, ...patch } : d))
    )
  }
  const removeCustomDay = (idx: number) =>
    onCustomDaysChange(customDays.filter((_, i) => i !== idx))

  const hasAnyCountry = locations.some((l) => !!l.country)
  const canOptimize = hasAnyCountry && !isOptimizing

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Plan your time off</CardTitle>
        <p className="text-xs text-muted-foreground">
          Pick your PTO budget, locations, and how you like to vacation. We&rsquo;ll figure out the
          best dates.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">PTO days available</Label>
            <Input
              type="number"
              min={1}
              max={60}
              value={dayOffBudget}
              onChange={handleInputChange}
              className="h-7 w-16 text-center"
            />
          </div>
          <Slider
            min={1}
            max={60}
            step={1}
            value={[dayOffBudget]}
            onValueChange={handleSliderChange}
          />
          <p className="text-[11px] text-muted-foreground">
            {dayOffBudget === 1 ? "1 PTO day" : `${dayOffBudget} PTO days`} to allocate
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Year</Label>
          <Select value={String(year)} onValueChange={(v) => onYearChange(parseInt(v, 10))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                  {y === currentYear ? " (remaining)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {year === currentYear && (
            <p className="text-[11px] text-muted-foreground">
              Optimizes from today through Dec 31.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Locations</Label>
            <span className="text-[11px] text-muted-foreground">
              {locations.length} {locations.length === 1 ? "location" : "locations"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Add multiple if you split time between places. Holidays from every location are merged.
          </p>
          <div className="space-y-2">
            {locations.map((location, idx) => (
              <LocationRow
                key={location.id}
                location={location}
                index={idx}
                countries={countries}
                states={location.country ? countryStates[location.country] : undefined}
                regions={
                  location.country && location.state
                    ? stateRegions[`${location.country}|${location.state}`]
                    : undefined
                }
                isLoadingCountries={isLoadingCountries}
                isLoadingStates={
                  !!location.country && loadingStateCountries.has(location.country)
                }
                isLoadingRegions={
                  !!location.country &&
                  !!location.state &&
                  loadingRegionKeys.has(`${location.country}|${location.state}`)
                }
                canRemove={locations.length > 1}
                onChange={(patch) => updateLocation(location.id, patch)}
                onRemove={() => removeLocation(location.id)}
              />
            ))}
          </div>
          <HapticButton
            type="button"
            variant="outline"
            size="sm"
            onClick={addLocation}
            className="w-full"
          >
            <MapPin className="size-3.5" />
            Add another location
          </HapticButton>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">Strategy</Label>
          <Select
            value={strategy}
            onValueChange={(v) => onStrategyChange(v as PlanStrategy)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STRATEGIES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {strategyDetail && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {strategyDetail.description}{" "}
              <span className="text-foreground/80">{strategyDetail.recommendedFor}</span>
            </p>
          )}
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="company-days">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <CalendarPlus className="size-3.5" />
                Company days off
                {customDays.length > 0 && (
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {customDays.length}
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="h-auto!">
              <div className="space-y-3">
                {customDays.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Optional. Add ad-hoc or recurring company days off (e.g. summer Fridays) so they
                    count toward your breaks.
                  </p>
                )}

                {customDays.map((day, idx) => (
                  <div
                    key={idx}
                    className="space-y-2 rounded-md border border-dashed border-border bg-muted/30 p-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={day.name}
                        onChange={(e) => updateCustomDay(idx, { name: e.target.value })}
                        placeholder="Label (e.g. Summer Friday)"
                      />
                      <HapticButton
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeCustomDay(idx)}
                        aria-label="Remove company day"
                      >
                        <Trash2 className="size-3.5" />
                      </HapticButton>
                    </div>

                    {day.isRecurring ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                          <Label className="text-[11px] text-muted-foreground">Weekday</Label>
                          <Select
                            value={String(day.weekday ?? 5)}
                            onValueChange={(v) =>
                              updateCustomDay(idx, { weekday: parseInt(v, 10) })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {WEEKDAYS.map((w) => (
                                <SelectItem key={w.value} value={String(w.value)}>
                                  {w.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">From</Label>
                          <DatePicker
                            value={day.startDate ?? ""}
                            onChange={(v) => updateCustomDay(idx, { startDate: v })}
                            placeholder="Start"
                            defaultMonth={new Date(year, 0, 1)}
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">To</Label>
                          <DatePicker
                            value={day.endDate ?? ""}
                            onChange={(v) => updateCustomDay(idx, { endDate: v })}
                            placeholder="End"
                            defaultMonth={new Date(year, 11, 1)}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Date</Label>
                        <DatePicker
                          value={day.date ?? ""}
                          onChange={(v) => updateCustomDay(idx, { date: v })}
                          placeholder="Pick a date"
                          defaultMonth={new Date(year, 0, 1)}
                        />
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex gap-2">
                  <HapticButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomDate}
                    className="flex-1"
                  >
                    + Single date
                  </HapticButton>
                  <HapticButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomRecurring}
                    className="flex-1"
                  >
                    + Recurring
                  </HapticButton>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <HapticButton
          type="button"
          onClick={onSubmit}
          disabled={!canOptimize}
          className="w-full"
        >
          {isOptimizing ? (
            <>
              <Spinner className="size-3.5" /> Optimizing...
            </>
          ) : (
            <>
              <Wand2 className="size-3.5" /> Optimize my time off
            </>
          )}
        </HapticButton>
        {!hasAnyCountry && (
          <p className="text-center text-[11px] text-muted-foreground">
            Pick at least one country to enable optimization.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
