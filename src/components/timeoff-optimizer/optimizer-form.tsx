"use client"

import * as React from "react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { CalendarPlus, Info, MapPin, Navigation, Trash2, Type, Wand2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  CustomDayOff,
  Location,
  PlanStrategy,
  TakenDayOff,
} from "@/lib/timeoff-optimizer/types"
import {
  HapticButton,
  HapticSelectItem as SelectItem,
  HapticSlider as Slider,
} from "@/components/haptic-wrappers"
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LocationRow } from "./location-row"
import { STRATEGIES } from "@/lib/timeoff-optimizer/strategies"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

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
  detectedLocation?: string | null

  customDays: CustomDayOff[]
  onCustomDaysChange: (days: CustomDayOff[]) => void

  takenDays: TakenDayOff[]
  onTakenDaysChange: (days: TakenDayOff[]) => void

  eventTitleTemplate: string
  onEventTitleTemplateChange: (value: string) => void
  eventNotesTemplate: string
  onEventNotesTemplateChange: (value: string) => void

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
    takenDays,
    onTakenDaysChange,
    eventTitleTemplate,
    onEventTitleTemplateChange,
    eventNotesTemplate,
    onEventNotesTemplateChange,
    detectedLocation,
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

  const addTakenDate = () =>
    onTakenDaysChange([...takenDays, { name: "Time off", date: "" }])
  const addTakenRange = () =>
    onTakenDaysChange([
      ...takenDays,
      { name: "Vacation", startDate: "", endDate: "" },
    ])
  const updateTakenDay = (idx: number, patch: Partial<TakenDayOff>) =>
    onTakenDaysChange(takenDays.map((d, i) => (i === idx ? { ...d, ...patch } : d)))
  const removeTakenDay = (idx: number) =>
    onTakenDaysChange(takenDays.filter((_, i) => i !== idx))

  const takenPtoCost = React.useMemo(() => {
    let total = 0
    for (const d of takenDays) {
      if (d.startDate && d.endDate) {
        // Count calendar days in range as full days (weekends still counted here - just an estimate)
        const start = new Date(d.startDate)
        const end = new Date(d.endDate)
        const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
        total += days
      } else if (d.date) {
        if (!d.startTime || !d.endTime) {
          total += 1
        } else {
          const [sh, sm] = d.startTime.split(":").map(Number)
          const [eh, em] = d.endTime.split(":").map(Number)
          const mins = Math.max(0, eh * 60 + em - (sh * 60 + sm))
          total += Math.min(1, Math.round((mins / 480) * 100) / 100)
        }
      }
    }
    return Math.round(total * 100) / 100
  }, [takenDays])

  const remainingBudget = Math.max(0, dayOffBudget - takenPtoCost)

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
            <div className="flex items-center gap-1">
              <Label className="text-xs font-medium">PTO days available</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-52 text-center text-[11px]">
                  Enter your total annual PTO balance. Days already taken are deducted automatically to find how many are left to plan.
                </TooltipContent>
              </Tooltip>
            </div>
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
          {takenPtoCost > 0 ? (
            <p className="text-[11px] text-muted-foreground">
              {dayOffBudget} total -{" "}
              <span className="text-amber-500">{takenPtoCost} taken</span>
              {" = "}
              <span className="font-medium text-foreground">{remainingBudget} days left to plan</span>
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {dayOffBudget === 1 ? "1 PTO day" : `${dayOffBudget} PTO days`} to allocate
            </p>
          )}
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
          {detectedLocation && (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Navigation className="size-3 shrink-0 text-primary" />
              Detected: <span className="font-medium text-foreground">{detectedLocation}</span>
            </p>
          )}
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

        <Accordion type="multiple">
          <AccordionItem value="taken-days">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <CalendarPlus className="size-3.5" />
                Already taken time off
                {takenDays.length > 0 && (
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {takenDays.length}
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="h-auto!">
              <div className="space-y-3">
                {takenDays.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Optional. Add days you&rsquo;ve already used so they&rsquo;re deducted from your
                    remaining PTO budget.
                  </p>
                )}

                {takenDays.map((day, idx) => {
                  const isRange = day.startDate !== undefined || day.endDate !== undefined
                  const preset =
                    !day.startTime && !day.endTime
                      ? "full"
                      : day.startTime === "09:00" && day.endTime === "13:00"
                        ? "morning"
                        : day.startTime === "13:00" && day.endTime === "17:00"
                          ? "afternoon"
                          : "custom"
                  const applyPreset = (p: "full" | "morning" | "afternoon") => {
                    if (p === "full") updateTakenDay(idx, { startTime: undefined, endTime: undefined })
                    else if (p === "morning") updateTakenDay(idx, { startTime: "09:00", endTime: "13:00" })
                    else updateTakenDay(idx, { startTime: "13:00", endTime: "17:00" })
                  }
                  return (
                    <div
                      key={idx}
                      className="space-y-2 rounded-md border border-dashed border-border bg-muted/30 p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          value={day.name}
                          onChange={(e) => updateTakenDay(idx, { name: e.target.value })}
                          placeholder="Label (e.g. Spring trip)"
                        />
                        <HapticButton
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeTakenDay(idx)}
                          aria-label="Remove taken day"
                        >
                          <Trash2 className="size-3.5" />
                        </HapticButton>
                      </div>

                      {isRange ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px] text-muted-foreground">From</Label>
                            <DatePicker
                              value={day.startDate ?? ""}
                              onChange={(v) => updateTakenDay(idx, { startDate: v })}
                              placeholder="Start"
                              defaultMonth={new Date()}
                            />
                          </div>
                          <div>
                            <Label className="text-[11px] text-muted-foreground">To</Label>
                            <DatePicker
                              value={day.endDate ?? ""}
                              onChange={(v) => updateTakenDay(idx, { endDate: v })}
                              placeholder="End"
                              defaultMonth={new Date()}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <Label className="text-[11px] text-muted-foreground">Date</Label>
                            <DatePicker
                              value={day.date ?? ""}
                              onChange={(v) => updateTakenDay(idx, { date: v })}
                              placeholder="Pick a date"
                              defaultMonth={new Date()}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground">Duration</Label>
                            <div className="flex gap-1">
                              {(["full", "morning", "afternoon"] as const).map((p) => (
                                <HapticButton
                                  key={p}
                                  type="button"
                                  variant={preset === p ? "default" : "outline"}
                                  size="sm"
                                  className="h-7 flex-1 text-[11px]"
                                  onClick={() => applyPreset(p)}
                                >
                                  {p === "full" ? "Full day" : p === "morning" ? "Morning" : "Afternoon"}
                                </HapticButton>
                              ))}
                              <HapticButton
                                type="button"
                                variant={preset === "custom" ? "default" : "outline"}
                                size="sm"
                                className="h-7 flex-1 text-[11px]"
                                onClick={() => {
                                  if (preset !== "custom") {
                                    updateTakenDay(idx, { startTime: "09:00", endTime: "17:00" })
                                  }
                                }}
                              >
                                Custom
                              </HapticButton>
                            </div>
                            {(preset === "custom" || (day.startTime && day.endTime)) && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[11px] text-muted-foreground">Start</Label>
                                  <Input
                                    type="time"
                                    value={day.startTime ?? "09:00"}
                                    onChange={(e) => updateTakenDay(idx, { startTime: e.target.value })}
                                    className="h-8 appearance-none bg-background text-xs [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] text-muted-foreground">End</Label>
                                  <Input
                                    type="time"
                                    value={day.endTime ?? "17:00"}
                                    onChange={(e) => updateTakenDay(idx, { endTime: e.target.value })}
                                    className="h-8 appearance-none bg-background text-xs [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}

                <div className="flex gap-2">
                  <HapticButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTakenDate}
                    className="flex-1"
                  >
                    + Single date
                  </HapticButton>
                  <HapticButton
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTakenRange}
                    className="flex-1"
                  >
                    + Date range
                  </HapticButton>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

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
                            defaultMonth={new Date()}
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">To</Label>
                          <DatePicker
                            value={day.endDate ?? ""}
                            onChange={(v) => updateCustomDay(idx, { endDate: v })}
                            placeholder="End"
                            defaultMonth={new Date()}
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
                          defaultMonth={new Date()}
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

          <AccordionItem value="event-text">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                <Type className="size-3.5" />
                Calendar event text
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Event title</Label>
                <Input
                  value={eventTitleTemplate}
                  onChange={(e) => onEventTitleTemplateChange(e.target.value)}
                  placeholder="Time off ({days} days)"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Event notes</Label>
                <Textarea
                  value={eventNotesTemplate}
                  onChange={(e) => onEventNotesTemplateChange(e.target.value)}
                  placeholder="{pto} PTO days, includes {names}"
                  className="h-24 max-h-40 resize-y overflow-y-auto field-sizing-fixed"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Leave blank for the default text. Variables: {"{days} {pto} {holidays} {weekends} {company} {start} {end} {year} {names}"}
              </p>
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
