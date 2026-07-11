import type {
  CustomDayOff,
  DayPlan,
  OffBlock,
  PlanInputs,
  PlanResult,
  PlanStrategy,
  PlanSummary,
  TakenDayOff
} from './types';

/**
 * Strategy tuning for candidate break selection.
 *
 * Block lengths are inclusive `[min, max]`. `spacing` is the minimum gap, in
 * days, between the end of one block and the start of the next, excluding both
 * endpoints. In index terms, this is enforced as
 * `next.startIndex - prev.endIndex - 1 >= spacing`.
 */
interface StrategyConfig {
  minLen: number;
  maxLen: number;
  spacing: number;
  /** Typical real-world approval lead time for this kind of break, in days. */
  defaultNoticeDays: number;
}

const STRATEGIES: Record<PlanStrategy, StrategyConfig> = {
  longWeekends: { minLen: 3, maxLen: 4, spacing: 7, defaultNoticeDays: 3 },
  miniBreaks: { minLen: 5, maxLen: 6, spacing: 14, defaultNoticeDays: 7 },
  weekLongBreaks: { minLen: 7, maxLen: 9, spacing: 21, defaultNoticeDays: 14 },
  extendedVacations: {
    minLen: 10,
    maxLen: 15,
    spacing: 30,
    defaultNoticeDays: 30
  },
  balanced: { minLen: 3, maxLen: 15, spacing: 21, defaultNoticeDays: 7 }
};

/** Exposed so the UI can seed per-strategy notice inputs with sensible defaults. */
export const STRATEGY_NOTICE_DEFAULTS: Record<PlanStrategy, number> =
  Object.fromEntries(
    Object.entries(STRATEGIES).map(([id, cfg]) => [id, cfg.defaultNoticeDays])
  ) as Record<PlanStrategy, number>;

/**
 * Date helpers operate entirely in local time on normalized midnight values.
 *
 * The optimizer deliberately avoids `Date.UTC` and timezone arithmetic so the
 * emitted `YYYY-MM-DD` strings always match the user's wall-calendar view.
 */

/**
 * Zero-pads a number for local ISO date formatting.
 */
function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

/**
 * Formats a local calendar date as `YYYY-MM-DD`.
 */
function toIso(d: Date): string {
  return (
    d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
  );
}

/**
 * Parses a `YYYY-MM-DD` string into a local-midnight `Date`.
 */
function fromIso(s: string): Date {
  // Expect 'YYYY-MM-DD'. Construct via numeric constructor so we stay in
  // local time and never trip on a stray 'Z' or TZ offset.
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Returns a copy of `d` shifted by `n` calendar days in local time.
 */
function addDays(d: Date, n: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/**
 * Whole calendar days between two local-midnight dates (b - a).
 */
function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/**
 * Returns the current day normalized to local midnight.
 */
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Normalized planning window for a single calendar year.
 */
interface WindowInfo {
  start: Date;
  end: Date;
  days: DayPlan[];
}

/**
 * Builds the planning window and day list for the requested year.
 *
 * For the current year, the window starts at `referenceDate` (defaults to
 * today) rather than January 1 so already-past dates are excluded from
 * planning. Pinning `referenceDate` lets callers reproduce the exact same
 * window on a later date, e.g. a calendar subscription feed that must not
 * silently drop/add events as days pass after the link was generated.
 */
function buildWindow(year: number, referenceDate?: Date): WindowInfo {
  const today = referenceDate ?? startOfToday();
  const currentYear = today.getFullYear();
  const jan1 = new Date(year, 0, 1, 0, 0, 0, 0);
  const dec31 = new Date(year, 11, 31, 0, 0, 0, 0);
  const start =
    year === currentYear && today.getTime() > jan1.getTime() ? today : jan1;
  const days: DayPlan[] = [];
  for (
    let cursor = new Date(start);
    cursor.getTime() <= dec31.getTime();
    cursor = addDays(cursor, 1)
  ) {
    const dow = cursor.getDay();
    days.push({
      date: toIso(cursor),
      isWeekend: dow === 0 || dow === 6,
      isDayOff: false,
      inOffBlock: false,
      isPublicHoliday: false,
      isCustomDayOff: false,
      isAlreadyTaken: false
    });
  }
  return { start, end: dec31, days };
}

/**
 * Annotates days that match public holidays.
 */
function applyHolidays(
  days: DayPlan[],
  holidays: { date: string; name: string }[] | undefined
): void {
  if (!holidays || holidays.length === 0) return;
  // First-match wins. Build a map from date string to the first occurrence.
  const map = new Map<string, string>();
  for (const h of holidays) {
    if (!map.has(h.date)) map.set(h.date, h.name);
  }
  for (const day of days) {
    const name = map.get(day.date);
    if (name !== undefined) {
      day.isPublicHoliday = true;
      day.holidayName = name;
    }
  }
}

/**
 * Annotates days that match caller-provided custom days off.
 */
function applyCompanyDays(
  days: DayPlan[],
  customDaysOff: CustomDayOff[] | undefined
): void {
  if (!customDaysOff || customDaysOff.length === 0) return;
  // Build (date -> name) honoring first-match wins, processing entries in the
  // order the caller supplied them. Single-date entries set their exact date.
  // Recurring entries fire on every matching weekday inside [startDate, endDate].
  const map = new Map<string, string>();
  for (const cd of customDaysOff) {
    if (cd.isRecurring) {
      if (
        !cd.startDate ||
        !cd.endDate ||
        cd.weekday === undefined ||
        cd.weekday === null
      )
        continue;
      const startD = fromIso(cd.startDate);
      const endD = fromIso(cd.endDate);
      if (endD.getTime() < startD.getTime()) continue;
      for (
        let cur = new Date(startD);
        cur.getTime() <= endD.getTime();
        cur = addDays(cur, 1)
      ) {
        if (cur.getDay() === cd.weekday) {
          const iso = toIso(cur);
          if (!map.has(iso)) map.set(iso, cd.name);
        }
      }
    } else if (cd.date) {
      if (!map.has(cd.date)) map.set(cd.date, cd.name);
    }
  }
  for (const day of days) {
    const name = map.get(day.date);
    if (name !== undefined) {
      day.isCustomDayOff = true;
      day.customDayName = name;
    }
  }
}

/**
 * Computes fractional PTO cost for a time-bounded taken day.
 * Assumes an 8-hour workday. Returns 1 when no times are specified.
 */
function computeTimeCost(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 1;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const mins = Math.max(0, eh * 60 + em - (sh * 60 + sm));
  return Math.min(1, Math.round((mins / 480) * 100) / 100);
}

/**
 * Annotates days that the user has already taken as PTO.
 * Single-date entries carry a fractional PTO cost based on start/end times.
 * Date-range entries always cost 1 working day per day in the range.
 */
function applyTakenDays(
  days: DayPlan[],
  takenDaysOff: TakenDayOff[] | undefined
): void {
  if (!takenDaysOff || takenDaysOff.length === 0) return;
  // Map date string -> { name, ptoCost }
  const map = new Map<string, { name: string; cost: number }>();
  for (const td of takenDaysOff) {
    if (td.startDate && td.endDate) {
      const startD = fromIso(td.startDate);
      const endD = fromIso(td.endDate);
      if (endD.getTime() < startD.getTime()) continue;
      for (
        let cur = new Date(startD);
        cur.getTime() <= endD.getTime();
        cur = addDays(cur, 1)
      ) {
        const iso = toIso(cur);
        if (!map.has(iso)) map.set(iso, { name: td.name, cost: 1 });
      }
    } else if (td.date) {
      if (!map.has(td.date)) {
        map.set(td.date, {
          name: td.name,
          cost: computeTimeCost(td.startTime, td.endTime)
        });
      }
    }
  }
  for (const day of days) {
    const entry = map.get(day.date);
    if (entry !== undefined) {
      day.isAlreadyTaken = true;
      day.takenName = entry.name;
      day.takenPtoCost = entry.cost;
    }
  }
}

/**
 * Candidate off block expressed as indexes into the planning window.
 */
interface Candidate {
  start: number; // index into days[]
  end: number; // inclusive
  length: number;
  ptoCost: number;
  efficiency: number; // length / ptoCost
}

/**
 * Returns whether a day is already off without spending PTO (or already consumed PTO).
 */
function isFixedOff(day: DayPlan): boolean {
  return (
    day.isWeekend ||
    day.isPublicHoliday ||
    day.isCustomDayOff ||
    day.isAlreadyTaken
  );
}

/**
 * Enumerates candidate PTO blocks that fit the selected strategy and budget.
 */
function enumerateCandidates(
  days: DayPlan[],
  cfg: StrategyConfig,
  budget: number
): Candidate[] {
  const n = days.length;
  const out: Candidate[] = [];
  // For each possible start index, build candidate blocks of every allowed
  // length. We trim blocks whose endpoints are fixed-off days because such
  // edges should be absorbed by an adjacent block; an "honest" block starts
  // and ends on a working day so its PTO is what literally extends the gap.
  for (let start = 0; start < n; start++) {
    // Skip starts that are fixed-off: those days are free, so a block that
    // starts on one is strictly inferior to the same block starting on the
    // next working day (same PTO, fewer days, equal or worse efficiency).
    if (isFixedOff(days[start])) continue;
    for (let len = cfg.minLen; len <= cfg.maxLen; len++) {
      const end = start + len - 1;
      if (end >= n) break;
      // Trim: ending on a plain weekend day is wasteful - that day is already
      // free and the same PTO could end on the next working day for equal or
      // better efficiency. However, ending on a public holiday or custom day
      // off is valuable (it captures a free weekday), so those are kept.
      if (days[end].isWeekend) continue;
      let ptoCost = 0;
      for (let i = start; i <= end; i++) {
        if (!isFixedOff(days[i])) ptoCost++;
      }
      if (ptoCost <= 0) continue; // invariant 1: skip useless candidates
      if (ptoCost > budget) continue; // invariant 2: cap by budget
      out.push({ start, end, length: len, ptoCost, efficiency: len / ptoCost });
    }
  }
  return out;
}

/**
 * Removes candidates that are strictly dominated by another candidate with the
 * same start index.
 */
function prune(cands: Candidate[]): Candidate[] {
  if (cands.length === 0) return cands;
  const byStart = new Map<number, Candidate[]>();
  for (const c of cands) {
    const arr = byStart.get(c.start);
    if (arr) arr.push(c);
    else byStart.set(c.start, [c]);
  }
  const kept: Candidate[] = [];
  for (const arr of byStart.values()) {
    for (const c of arr) {
      let dominated = false;
      for (const o of arr) {
        if (o === c) continue;
        if (o.end >= c.end && o.ptoCost <= c.ptoCost && o.length >= c.length) {
          // Strictly better on at least one axis?
          if (o.end > c.end || o.ptoCost < c.ptoCost || o.length > c.length) {
            dominated = true;
            break;
          }
        }
      }
      if (!dominated) kept.push(c);
    }
  }
  return kept;
}

/**
 * Greedily selects non-overlapping candidates using deterministic tiebreakers.
 */
function selectBlocks(
  candidates: Candidate[],
  spacing: number,
  budget: number,
  totalDays: number,
  noticeCutoffIndex: number
): Candidate[] {
  if (candidates.length === 0 || budget <= 0) return [];
  // Sort: candidates that respect the notice window first (soft preference -
  // an early-starting block can still win if nothing later fits the budget);
  // then best efficiency; then longer blocks; then earlier start; then lower
  // pto cost. All deterministic; no Math.random.
  const sorted = candidates.slice().sort((a, b) => {
    const aRespects = a.start >= noticeCutoffIndex;
    const bRespects = b.start >= noticeCutoffIndex;
    if (aRespects !== bRespects) return aRespects ? -1 : 1;
    if (b.efficiency !== a.efficiency) return b.efficiency - a.efficiency;
    if (b.length !== a.length) return b.length - a.length;
    if (a.start !== b.start) return a.start - b.start;
    return a.ptoCost - b.ptoCost;
  });

  // Track occupancy using a flat boolean array indexed by day. This makes the
  // overlap + spacing test O(spacing) per candidate. For a one-year window
  // (<= 366 days) and ~thousands of candidates this is cheap.
  const occupied = new Uint8Array(totalDays);
  const chosen: Candidate[] = [];
  let remaining = budget;

  for (const c of sorted) {
    if (c.ptoCost > remaining) continue;
    // Check overlap and spacing. The block occupies [start, end]; we also
    // require that no previously-chosen block lies within `spacing` days on
    // either side. Equivalent: scan [start - spacing, end + spacing] for any
    // occupied cell that is not in [start, end] itself.
    const lo = Math.max(0, c.start - spacing);
    const hi = Math.min(totalDays - 1, c.end + spacing);
    let conflict = false;
    for (let i = lo; i <= hi; i++) {
      if (occupied[i]) {
        // Allow re-touching ourselves only - impossible here since we have
        // not committed yet, so any occupied cell is a real conflict.
        conflict = true;
        break;
      }
    }
    if (conflict) continue;
    // Commit.
    for (let i = c.start; i <= c.end; i++) occupied[i] = 1;
    chosen.push(c);
    remaining -= c.ptoCost;
    if (remaining <= 0) break;
  }
  // Return chosen in chronological order for downstream simplicity.
  chosen.sort((a, b) => a.start - b.start);
  return chosen;
}

/**
 * Applies the chosen candidate blocks onto the day list and returns PTO spent.
 */
function markChosen(days: DayPlan[], chosen: Candidate[]): number {
  let ptoSpent = 0;
  for (const c of chosen) {
    for (let i = c.start; i <= c.end; i++) {
      const day = days[i];
      day.inOffBlock = true;
      if (!isFixedOff(day) && !day.isDayOff) {
        day.isDayOff = true;
        ptoSpent++;
      }
    }
  }
  return ptoSpent;
}

/**
 * Extends existing breaks forward with any remaining PTO on working days.
 *
 * This phase intentionally spends remaining PTO even if doing so falls outside
 * the preferred block lengths from the selected strategy.
 */
/**
 * Extends each existing break by at most ONE working day per call so that
 * `spendRemaining`'s while-loop distributes leftover PTO evenly across all
 * breaks rather than piling every remaining day onto the first break found.
 * Returns the number of PTO days actually spent.
 */
function extendBreaksForward(days: DayPlan[], remaining: number): number {
  if (remaining <= 0) return 0;
  const n = days.length;
  let spent = 0;
  let i = 0;
  while (i < n && remaining > 0) {
    if (!days[i].inOffBlock) {
      i++;
      continue;
    }
    // Walk to the end of this contiguous run.
    let j = i;
    while (j + 1 < n && days[j + 1].inOffBlock) j++;
    // Extend by exactly one working day (not fixed-off, not already claimed).
    const k = j + 1;
    if (k < n && !days[k].inOffBlock && !isFixedOff(days[k])) {
      days[k].isDayOff = true;
      days[k].inOffBlock = true;
      remaining--;
      spent++;
    }
    // Advance past the (possibly extended) run.
    i = k + 1;
  }
  return spent;
}

/**
 * Emits new break segments when PTO remains after extending existing breaks.
 *
 * This is the final fallback for spending leftover PTO when budget takes
 * precedence over strategy shape preferences.
 */
function emitForcedSegments(days: DayPlan[], remaining: number): number {
  if (remaining <= 0) return 0;
  const n = days.length;
  let spent = 0;
  let i = 0;
  while (i < n && remaining > 0) {
    const day = days[i];
    if (day.inOffBlock || isFixedOff(day)) {
      i++;
      continue;
    }
    // Found a run of unbroken working days. Consume up to `remaining` of them.
    let j = i;
    while (j < n && remaining > 0) {
      const d = days[j];
      if (d.inOffBlock || isFixedOff(d)) break;
      d.isDayOff = true;
      d.inOffBlock = true;
      remaining--;
      spent++;
      j++;
    }
    i = j + 1;
  }
  return spent;
}

/**
 * Spends any remaining PTO after the main selection pass.
 */
function spendRemaining(days: DayPlan[], remaining: number): void {
  // Loop extend + emit until no progress. Spec invariant 5.
  let budget = remaining;
  while (budget > 0) {
    const before = budget;
    budget -= extendBreaksForward(days, budget);
    if (budget <= 0) break;
    budget -= emitForcedSegments(days, budget);
    if (budget === before) break; // no progress
  }
}

/**
 * Expands each contiguous `inOffBlock` run to absorb any adjacent fixed-off
 * days (weekends, public holidays, custom days off). This ensures that breaks
 * formed by the extension/forced-segment phases display with their surrounding
 * weekends included, and causes a forced Monday PTO (emitted after a
 * Friday-ending block) to merge with that block via the intervening weekend.
 *
 * Only fixed-off days that are not already part of another block are absorbed,
 * so two blocks separated by actual working days are never merged.
 */
function expandToAdjacentFixedOff(days: DayPlan[]): void {
  const n = days.length;
  let i = 0;
  while (i < n) {
    if (!days[i].inOffBlock) {
      i++;
      continue;
    }
    // Walk to the end of this contiguous inOffBlock run.
    let j = i;
    while (j + 1 < n && days[j + 1].inOffBlock) j++;
    // Expand backward through consecutive fixed-off days preceding the block.
    let lo = i - 1;
    while (lo >= 0 && !days[lo].inOffBlock && isFixedOff(days[lo])) {
      days[lo].inOffBlock = true;
      lo--;
    }
    // Expand forward through consecutive fixed-off days following the block.
    let hi = j + 1;
    while (hi < n && !days[hi].inOffBlock && isFixedOff(days[hi])) {
      days[hi].inOffBlock = true;
      hi++;
    }
    i = hi;
  }
}

/**
 * Builds the `OffBlock[]` view from marked days.
 *
 * A break is any maximal contiguous run where `inOffBlock` is `true`.
 */
function collectBreaks(days: DayPlan[]): OffBlock[] {
  const out: OffBlock[] = [];
  const n = days.length;
  let i = 0;
  while (i < n) {
    if (!days[i].inOffBlock) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < n && days[j + 1].inOffBlock) j++;
    const slice = days.slice(i, j + 1);
    let dayOffCount = 0;
    let holidayCount = 0;
    let weekendCount = 0;
    let customDayCount = 0;
    let alreadyTakenCount = 0;
    for (const d of slice) {
      if (d.isDayOff) dayOffCount++;
      // Categorical counters: a single day might be both a public holiday
      // and a weekend (e.g. a holiday that lands on a Saturday). The UI's
      // existing display lists them under "holidayCount" first; we count
      // it under holidayCount in that case and not under weekendCount, so the
      // counters partition the days of the break.
      if (d.isPublicHoliday) holidayCount++;
      else if (d.isCustomDayOff) customDayCount++;
      else if (d.isWeekend) weekendCount++;
      else if (d.isAlreadyTaken && !d.isDayOff) alreadyTakenCount++;
    }
    out.push({
      startDate: slice[0].date,
      endDate: slice[slice.length - 1].date,
      days: slice,
      totalDays: slice.length,
      dayOffCount,
      holidayCount,
      weekendCount,
      customDayCount,
      alreadyTakenCount
    });
    i = j + 1;
  }
  out.sort((a, b) =>
    a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0
  );
  return out;
}

/**
 * Aggregates summary counters from the computed break list and all days.
 */
function computeStats(breaks: OffBlock[], allDays: DayPlan[]): PlanSummary {
  let totalDayOffs = 0;
  let totalHolidays = 0;
  let totalWeekendDays = 0;
  let totalCustomDays = 0;
  let totalDaysOff = 0;
  for (const b of breaks) {
    totalDayOffs += b.dayOffCount;
    totalHolidays += b.holidayCount;
    totalWeekendDays += b.weekendCount;
    totalCustomDays += b.customDayCount;
    totalDaysOff += b.totalDays;
  }
  // Sum fractional PTO cost and standalone calendar days for already-taken days.
  // Standalone = not inside an optimizer-planned break (inOffBlock=false).
  // Days inside optimizer breaks are already counted in totalDaysOff.
  let totalTakenDays = 0;
  let totalTakenCalendarDays = 0;
  for (const day of allDays) {
    if (day.isAlreadyTaken) {
      if (!day.isWeekend && !day.isPublicHoliday && !day.isCustomDayOff) {
        totalTakenDays += day.takenPtoCost ?? 1;
      }
      if (!day.inOffBlock) {
        totalTakenCalendarDays++;
      }
    }
  }
  totalTakenDays = Math.round(totalTakenDays * 100) / 100;
  return {
    totalDayOffs,
    totalTakenDays,
    totalTakenCalendarDays,
    totalHolidays,
    totalWeekendDays,
    totalCustomDays,
    totalDaysOff
  };
}

/**
 * Computes a time-off plan for the requested year, budget, and strategy.
 *
 * The optimizer works entirely in local calendar time and returns both the
 * annotated day list and the derived break summary.
 *
 * @param params - Planner inputs including budget, strategy, holidays, and custom days off.
 * @returns The computed day-by-day plan plus summarized break data.
 */
export function optimizeDays(params: PlanInputs): PlanResult {
  const strategy: PlanStrategy = params.strategy ?? 'balanced';
  const cfg = STRATEGIES[strategy] ?? STRATEGIES.balanced;
  const year = params.year ?? new Date().getFullYear();
  const budget = Math.max(0, Math.floor(params.dayOffBudget || 0));

  const referenceDate = params.referenceDate
    ? fromIso(params.referenceDate)
    : undefined;
  const window = buildWindow(year, referenceDate);
  const { days } = window;
  applyHolidays(days, params.holidays);
  applyCompanyDays(days, params.customDaysOff);
  applyTakenDays(days, params.takenDaysOff);

  // Deduct already-taken working days from the budget before optimizing.
  // Uses fractional costs for time-based entries (e.g. half-day = 0.5).
  let takenPtoFloat = 0;
  for (const day of days) {
    if (
      day.isAlreadyTaken &&
      !day.isWeekend &&
      !day.isPublicHoliday &&
      !day.isCustomDayOff
    ) {
      takenPtoFloat += day.takenPtoCost ?? 1;
    }
  }
  // Floor to whole days - the block optimizer works in integer day units.
  const effectiveBudget = Math.max(0, Math.floor(budget - takenPtoFloat));

  // Zero-budget short circuit: emit annotated days with no breaks.
  if (effectiveBudget === 0 || days.length === 0) {
    return { days, breaks: [], stats: computeStats([], days) };
  }

  // Main pass.
  const minNoticeDays = params.minNoticeDays ?? cfg.defaultNoticeDays;
  const noticeCutoffIndex = Math.max(
    0,
    diffDays(
      window.start,
      addDays(referenceDate ?? startOfToday(), minNoticeDays)
    )
  );
  const rawCandidates = enumerateCandidates(days, cfg, effectiveBudget);
  const pruned = prune(rawCandidates);
  const chosen = selectBlocks(
    pruned,
    cfg.spacing,
    effectiveBudget,
    days.length,
    noticeCutoffIndex
  );
  const ptoSpent = markChosen(days, chosen);

  // Forced extension + forced segments to spend the rest of the budget.
  const remaining = effectiveBudget - ptoSpent;
  spendRemaining(days, remaining);

  // Absorb adjacent weekends/holidays into each break so that extension-phase
  // and forced-segment PTO days display with surrounding context and naturally
  // merge with adjacent blocks across a weekend gap.
  expandToAdjacentFixedOff(days);

  const breaks = collectBreaks(days);
  const stats = computeStats(breaks, days);

  return { days, breaks, stats };
}

/**
 * Asynchronously computes a time-off plan after yielding once to the event
 * loop so the UI can render loading feedback first.
 *
 * @param params - Planner inputs including budget, strategy, holidays, and custom days off.
 * @returns A promise that resolves to the computed plan.
 */
export function optimizeDaysAsync(params: PlanInputs): Promise<PlanResult> {
  return new Promise((resolve) => {
    // Yield once so the UI can paint the spinner before we burn the main
    // thread. The setTimeout(0) is the standard "next tick" hook.
    setTimeout(() => {
      resolve(optimizeDays(params));
    }, 0);
  });
}
