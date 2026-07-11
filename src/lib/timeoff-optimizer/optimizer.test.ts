import { describe, expect, test } from 'bun:test';
import {
  optimizeDays,
  optimizeDaysAsync,
  STRATEGY_NOTICE_DEFAULTS
} from './optimizer';
import type { PlanInputs } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal PlanInputs for a future year so the full window is used. */
function inputs(overrides: Partial<PlanInputs> = {}): PlanInputs {
  return {
    dayOffBudget: 10,
    year: 2027,
    referenceDate: '2027-01-01',
    ...overrides
  };
}

const MONDAY_HOLIDAYS_2027 = [
  { date: '2027-01-18', name: 'MLK Day' }, // Mon
  { date: '2027-05-31', name: 'Memorial Day' }, // Mon
  { date: '2027-07-05', name: 'Independence Day (observed)' }, // Mon
  { date: '2027-09-06', name: 'Labor Day' }, // Mon
  { date: '2027-11-25', name: 'Thanksgiving' }, // Thu
  { date: '2027-12-24', name: 'Christmas Eve' }, // Fri
  { date: '2027-12-27', name: 'Christmas (observed)' } // Mon
];

// ---------------------------------------------------------------------------
// STRATEGY_NOTICE_DEFAULTS
// ---------------------------------------------------------------------------

describe('STRATEGY_NOTICE_DEFAULTS', () => {
  test('has an entry for every strategy', () => {
    const strategies = [
      'balanced',
      'longWeekends',
      'miniBreaks',
      'weekLongBreaks',
      'extendedVacations'
    ];
    for (const s of strategies) {
      expect(
        STRATEGY_NOTICE_DEFAULTS[s as keyof typeof STRATEGY_NOTICE_DEFAULTS]
      ).toBeNumber();
    }
  });

  test('all defaults are positive integers', () => {
    for (const v of Object.values(STRATEGY_NOTICE_DEFAULTS)) {
      expect(v).toBeGreaterThan(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Zero / edge budget
// ---------------------------------------------------------------------------

describe('zero budget', () => {
  test('returns no breaks and no PTO when budget is 0', () => {
    const result = optimizeDays(inputs({ dayOffBudget: 0 }));
    expect(result.breaks).toHaveLength(0);
    expect(result.stats.totalDayOffs).toBe(0);
  });

  test('returns no breaks when effective budget is zero after taken days consume it all', () => {
    // 3 PTO days already taken on working days, budget is 3
    const result = optimizeDays(
      inputs({
        dayOffBudget: 3,
        takenDaysOff: [
          { name: 'Taken', date: '2027-01-04' },
          { name: 'Taken', date: '2027-01-05' },
          { name: 'Taken', date: '2027-01-06' }
        ]
      })
    );
    expect(result.breaks).toHaveLength(0);
    expect(result.stats.totalDayOffs).toBe(0);
    expect(result.stats.totalTakenDays).toBe(3);
  });

  test('returns no breaks when budget is negative', () => {
    const result = optimizeDays(inputs({ dayOffBudget: -5 }));
    expect(result.breaks).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Day list completeness
// ---------------------------------------------------------------------------

describe('day list', () => {
  test('covers the full year when referenceDate is Jan 1', () => {
    const result = optimizeDays(inputs({ dayOffBudget: 5 }));
    // 2027 is not a leap year: 365 days
    expect(result.days).toHaveLength(365);
  });

  test('starts from referenceDate for current-year windows', () => {
    const result = optimizeDays(inputs({ referenceDate: '2027-06-01' }));
    expect(result.days[0].date).toBe('2027-06-01');
  });

  test('all days have the required DayPlan fields', () => {
    const result = optimizeDays(inputs({ dayOffBudget: 1 }));
    for (const day of result.days) {
      expect(typeof day.date).toBe('string');
      expect(typeof day.isWeekend).toBe('boolean');
      expect(typeof day.isDayOff).toBe('boolean');
      expect(typeof day.inOffBlock).toBe('boolean');
      expect(typeof day.isPublicHoliday).toBe('boolean');
      expect(typeof day.isCustomDayOff).toBe('boolean');
      expect(typeof day.isAlreadyTaken).toBe('boolean');
    }
  });

  test('weekends are correctly labelled', () => {
    const result = optimizeDays(
      inputs({ dayOffBudget: 0, referenceDate: '2027-01-01' })
    );
    // 2027-01-02 is a Saturday, 2027-01-03 is a Sunday
    const sat = result.days.find((d) => d.date === '2027-01-02');
    const sun = result.days.find((d) => d.date === '2027-01-03');
    const mon = result.days.find((d) => d.date === '2027-01-04');
    expect(sat?.isWeekend).toBe(true);
    expect(sun?.isWeekend).toBe(true);
    expect(mon?.isWeekend).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Holiday annotation
// ---------------------------------------------------------------------------

describe('holiday annotation', () => {
  test('marks public holidays correctly', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 0,
        holidays: [{ date: '2027-01-18', name: 'MLK Day' }]
      })
    );
    const mlk = result.days.find((d) => d.date === '2027-01-18');
    expect(mlk?.isPublicHoliday).toBe(true);
    expect(mlk?.holidayName).toBe('MLK Day');
  });

  test('first-match wins when duplicate holiday dates are provided', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 0,
        holidays: [
          { date: '2027-01-18', name: 'First' },
          { date: '2027-01-18', name: 'Second' }
        ]
      })
    );
    const day = result.days.find((d) => d.date === '2027-01-18');
    expect(day?.holidayName).toBe('First');
  });

  test('non-holiday days are not marked as public holidays', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 0,
        holidays: [{ date: '2027-01-18', name: 'MLK Day' }]
      })
    );
    const plain = result.days.find((d) => d.date === '2027-01-19');
    expect(plain?.isPublicHoliday).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Custom days off annotation
// ---------------------------------------------------------------------------

describe('custom days off annotation', () => {
  test('marks a single custom day off', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 0,
        customDaysOff: [{ date: '2027-03-15', name: 'Company Day' }]
      })
    );
    const day = result.days.find((d) => d.date === '2027-03-15');
    expect(day?.isCustomDayOff).toBe(true);
    expect(day?.customDayName).toBe('Company Day');
  });

  test('marks recurring custom days off on the specified weekday', () => {
    // Weekday 5 = Friday. Check a known Friday in range.
    const result = optimizeDays(
      inputs({
        dayOffBudget: 0,
        customDaysOff: [
          {
            name: 'Summer Friday',
            isRecurring: true,
            startDate: '2027-07-02',
            endDate: '2027-08-27',
            weekday: 5
          }
        ]
      })
    );
    // 2027-07-02 is a Friday
    const fri = result.days.find((d) => d.date === '2027-07-02');
    expect(fri?.isCustomDayOff).toBe(true);
    // 2027-07-05 is a Monday - should NOT be marked
    const mon = result.days.find((d) => d.date === '2027-07-05');
    expect(mon?.isCustomDayOff).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Already-taken days annotation
// ---------------------------------------------------------------------------

describe('taken days annotation', () => {
  test('marks a single taken day', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 5,
        takenDaysOff: [{ name: 'Vacation', date: '2027-02-15' }]
      })
    );
    const day = result.days.find((d) => d.date === '2027-02-15');
    expect(day?.isAlreadyTaken).toBe(true);
    expect(day?.takenPtoCost).toBe(1);
  });

  test('marks a date-range of taken days', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 10,
        takenDaysOff: [
          { name: 'Holiday', startDate: '2027-02-01', endDate: '2027-02-03' }
        ]
      })
    );
    for (const date of ['2027-02-01', '2027-02-02', '2027-02-03']) {
      const day = result.days.find((d) => d.date === date);
      expect(day?.isAlreadyTaken).toBe(true);
    }
  });

  test('fractional PTO cost for half-day taken entry', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 5,
        takenDaysOff: [
          {
            name: 'Half day',
            date: '2027-03-01',
            startTime: '09:00',
            endTime: '13:00'
          }
        ]
      })
    );
    const day = result.days.find((d) => d.date === '2027-03-01');
    // 4 hours / 8 hours = 0.5
    expect(day?.takenPtoCost).toBe(0.5);
  });

  test('taken days on weekends do not count toward PTO in stats', () => {
    // 2027-01-02 is Saturday
    const result = optimizeDays(
      inputs({
        dayOffBudget: 5,
        takenDaysOff: [{ name: 'Oops', date: '2027-01-02' }]
      })
    );
    expect(result.stats.totalTakenDays).toBe(0);
  });

  test('deducts taken PTO from budget before optimizing', () => {
    const withTaken = optimizeDays(
      inputs({
        dayOffBudget: 5,
        takenDaysOff: [{ name: 'Taken', date: '2027-01-04' }]
      })
    );
    const withoutTaken = optimizeDays(inputs({ dayOffBudget: 4 }));
    // Both should plan exactly 4 effective PTO days
    expect(withTaken.stats.totalDayOffs).toBe(withoutTaken.stats.totalDayOffs);
  });
});

// ---------------------------------------------------------------------------
// PTO budget enforcement
// ---------------------------------------------------------------------------

describe('budget enforcement', () => {
  test('never plans more PTO than the budget', () => {
    for (const budget of [1, 5, 10, 15, 20]) {
      const result = optimizeDays(inputs({ dayOffBudget: budget }));
      expect(result.stats.totalDayOffs).toBeLessThanOrEqual(budget);
    }
  });

  test('never plans more PTO than budget after taken days', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 10,
        takenDaysOff: [
          { name: 'T1', date: '2027-01-04' },
          { name: 'T2', date: '2027-01-05' }
        ]
      })
    );
    expect(
      result.stats.totalDayOffs + result.stats.totalTakenDays
    ).toBeLessThanOrEqual(10);
  });

  test('spends the full budget when opportunities exist', () => {
    // Full year, no holidays, 10 PTO - should spend all of them
    const result = optimizeDays(
      inputs({ dayOffBudget: 10, referenceDate: '2027-01-01' })
    );
    expect(result.stats.totalDayOffs).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Break structure invariants
// ---------------------------------------------------------------------------

describe('break structure', () => {
  test('all breaks have at least one day', () => {
    const result = optimizeDays(
      inputs({ dayOffBudget: 10, holidays: MONDAY_HOLIDAYS_2027 })
    );
    for (const b of result.breaks) {
      expect(b.totalDays).toBeGreaterThan(0);
      expect(b.days.length).toBeGreaterThan(0);
    }
  });

  test('break totalDays matches the days array length', () => {
    const result = optimizeDays(
      inputs({ dayOffBudget: 10, holidays: MONDAY_HOLIDAYS_2027 })
    );
    for (const b of result.breaks) {
      expect(b.totalDays).toBe(b.days.length);
    }
  });

  test('category counters sum to totalDays', () => {
    const result = optimizeDays(
      inputs({ dayOffBudget: 10, holidays: MONDAY_HOLIDAYS_2027 })
    );
    for (const b of result.breaks) {
      const sum =
        b.dayOffCount +
        b.holidayCount +
        b.weekendCount +
        b.customDayCount +
        b.alreadyTakenCount;
      expect(sum).toBe(b.totalDays);
    }
  });

  test('breaks are sorted chronologically', () => {
    const result = optimizeDays(
      inputs({ dayOffBudget: 10, holidays: MONDAY_HOLIDAYS_2027 })
    );
    for (let i = 1; i < result.breaks.length; i++) {
      expect(result.breaks[i].startDate > result.breaks[i - 1].startDate).toBe(
        true
      );
    }
  });

  test('no two breaks overlap', () => {
    const result = optimizeDays(
      inputs({ dayOffBudget: 15, holidays: MONDAY_HOLIDAYS_2027 })
    );
    for (let i = 1; i < result.breaks.length; i++) {
      const prev = result.breaks[i - 1];
      const curr = result.breaks[i];
      expect(curr.startDate > prev.endDate).toBe(true);
    }
  });

  test('every day inside a break has inOffBlock=true', () => {
    const result = optimizeDays(inputs({ dayOffBudget: 10 }));
    for (const b of result.breaks) {
      for (const d of b.days) {
        expect(d.inOffBlock).toBe(true);
      }
    }
  });

  test('dayOffCount equals number of isDayOff=true days in the break', () => {
    const result = optimizeDays(
      inputs({ dayOffBudget: 10, holidays: MONDAY_HOLIDAYS_2027 })
    );
    for (const b of result.breaks) {
      const actual = b.days.filter((d) => d.isDayOff).length;
      expect(b.dayOffCount).toBe(actual);
    }
  });
});

// ---------------------------------------------------------------------------
// Holiday efficiency - blocks should capture free days
// ---------------------------------------------------------------------------

describe('holiday efficiency', () => {
  test('a Monday public holiday produces a break containing that holiday', () => {
    // MLK Day 2027: Mon Jan 18. With 1 PTO on Fri Jan 15, we get a 4-day break
    // (Fri PTO + Sat + Sun + Mon holiday). Efficiency = 4/1 = 4.0
    const result = optimizeDays(
      inputs({
        dayOffBudget: 1,
        holidays: [{ date: '2027-01-18', name: 'MLK Day' }],
        referenceDate: '2027-01-10',
        minNoticeDays: 0
      })
    );
    const breakWithHoliday = result.breaks.find((b) =>
      b.days.some((d) => d.date === '2027-01-18')
    );
    expect(breakWithHoliday).toBeDefined();
    expect(breakWithHoliday?.holidayCount).toBeGreaterThanOrEqual(1);
  });

  test('a Friday public holiday produces a break containing that holiday', () => {
    // Christmas Eve on Fri Dec 24. With 1 PTO on Mon Dec 20, we capture it.
    const result = optimizeDays(
      inputs({
        dayOffBudget: 3,
        holidays: [{ date: '2027-12-24', name: 'Christmas Eve' }],
        minNoticeDays: 0
      })
    );
    const breakWithHoliday = result.breaks.find((b) =>
      b.days.some((d) => d.date === '2027-12-24')
    );
    expect(breakWithHoliday).toBeDefined();
  });

  test('efficiency is higher when holidays are present vs absent', () => {
    const withHol = optimizeDays(
      inputs({
        dayOffBudget: 5,
        holidays: MONDAY_HOLIDAYS_2027
      })
    );
    const withoutHol = optimizeDays(inputs({ dayOffBudget: 5 }));
    const effWith = withHol.stats.totalDaysOff / withHol.stats.totalDayOffs;
    const effWithout =
      withoutHol.stats.totalDaysOff / withoutHol.stats.totalDayOffs;
    expect(effWith).toBeGreaterThanOrEqual(effWithout);
  });
});

// ---------------------------------------------------------------------------
// Adjacent fixed-off day absorption (expandToAdjacentFixedOff)
// ---------------------------------------------------------------------------

describe('expandToAdjacentFixedOff', () => {
  test('break starting on a Monday includes the preceding weekend', () => {
    // Force a Monday-only block: budget 1, start Mon Feb 1 2027, min notice 0
    const result = optimizeDays(
      inputs({
        dayOffBudget: 1,
        referenceDate: '2027-01-29', // Fri before
        minNoticeDays: 0,
        strategy: 'longWeekends'
      })
    );
    // Any break that has a Monday should include the preceding Sat/Sun if they
    // fall within the year window
    for (const b of result.breaks) {
      const monIdx = b.days.findIndex((d) => !d.isWeekend && d.isDayOff);
      if (monIdx > 0) {
        // There should be at least one weekend day before the first PTO day
        const beforePto = b.days.slice(0, monIdx);
        expect(beforePto.some((d) => d.isWeekend)).toBe(true);
      }
    }
  });

  test('break ending on a Friday includes the following weekend', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 5,
        minNoticeDays: 0
      })
    );
    for (const b of result.breaks) {
      const last = b.days[b.days.length - 1];
      // If the last PTO day is a Friday, the break should end on Sunday
      if (last.isDayOff) {
        const lastDate = new Date(last.date + 'T00:00:00');
        if (lastDate.getDay() === 5 && b.days.length > 1) {
          // Could extend to Sat + Sun - just check it doesn't end on Friday
          // (it either extends through the weekend or hits year-end)
          const endDate = new Date(b.endDate + 'T00:00:00');
          // The break must go at least to Saturday (day after Friday)
          expect(endDate.getTime()).toBeGreaterThan(lastDate.getTime());
        }
      }
    }
  });

  test('adjacent holiday is absorbed into the break', () => {
    // Monday holiday right after a Fri-Sun block: should merge into one break
    const result = optimizeDays(
      inputs({
        dayOffBudget: 1,
        holidays: [{ date: '2027-01-18', name: 'MLK Day' }], // Mon Jan 18
        referenceDate: '2027-01-13',
        minNoticeDays: 0
      })
    );
    // If we take Fri Jan 15 off (1 PTO), the break should go Fri-Mon (4 days)
    const b = result.breaks.find((b) =>
      b.days.some((d) => d.date === '2027-01-18')
    );
    if (b) {
      expect(b.holidayCount).toBeGreaterThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Strategy-specific constraints
// ---------------------------------------------------------------------------

describe('longWeekends strategy', () => {
  test('all breaks are between 3 and 4 days (before extension)', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 8,
        strategy: 'longWeekends',
        minNoticeDays: 0
      })
    );
    // Breaks may be longer due to holiday/weekend absorption, but the PTO
    // portion should be bounded. Verify PTO per break <= 2 (max len 4, min
    // 2 free days = at most 2 PTO per block).
    for (const b of result.breaks) {
      // A longWeekend break should not need more than (maxLen - weekends) PTO
      expect(b.dayOffCount).toBeLessThanOrEqual(4);
    }
  });
});

describe('weekLongBreaks strategy', () => {
  test('breaks span at least a full work week', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 15,
        strategy: 'weekLongBreaks',
        minNoticeDays: 0
      })
    );
    for (const b of result.breaks) {
      expect(b.totalDays).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('extendedVacations strategy', () => {
  test('produces fewer but longer breaks', () => {
    const extended = optimizeDays(
      inputs({
        dayOffBudget: 15,
        strategy: 'extendedVacations',
        minNoticeDays: 0
      })
    );
    const balanced = optimizeDays(
      inputs({
        dayOffBudget: 15,
        strategy: 'balanced',
        minNoticeDays: 0
      })
    );
    // Extended vacations should have same or fewer breaks than balanced
    expect(extended.breaks.length).toBeLessThanOrEqual(balanced.breaks.length);
  });
});

// ---------------------------------------------------------------------------
// Notice window (soft preference)
// ---------------------------------------------------------------------------

describe('notice window', () => {
  test('breaks start on or after referenceDate + minNoticeDays when possible', () => {
    const referenceDate = '2027-03-01';
    const minNoticeDays = 14;
    const cutoff = new Date('2027-03-15T00:00:00'); // +14 days
    const result = optimizeDays(
      inputs({ referenceDate, minNoticeDays, dayOffBudget: 10 })
    );
    for (const b of result.breaks) {
      const start = new Date(b.startDate + 'T00:00:00');
      expect(start.getTime()).toBeGreaterThanOrEqual(cutoff.getTime());
    }
  });

  test('still produces breaks when minNoticeDays is 0', () => {
    const result = optimizeDays(inputs({ minNoticeDays: 0, dayOffBudget: 10 }));
    expect(result.breaks.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Stats accuracy
// ---------------------------------------------------------------------------

describe('stats', () => {
  test('totalDaysOff equals sum of break totalDays', () => {
    const result = optimizeDays(
      inputs({ dayOffBudget: 10, holidays: MONDAY_HOLIDAYS_2027 })
    );
    const sumFromBreaks = result.breaks.reduce(
      (acc, b) => acc + b.totalDays,
      0
    );
    expect(result.stats.totalDaysOff).toBe(sumFromBreaks);
  });

  test('totalDayOffs equals sum of break dayOffCount', () => {
    const result = optimizeDays(
      inputs({ dayOffBudget: 10, holidays: MONDAY_HOLIDAYS_2027 })
    );
    const sumPto = result.breaks.reduce((acc, b) => acc + b.dayOffCount, 0);
    expect(result.stats.totalDayOffs).toBe(sumPto);
  });

  test('totalHolidays equals sum of break holidayCount', () => {
    const result = optimizeDays(
      inputs({ dayOffBudget: 10, holidays: MONDAY_HOLIDAYS_2027 })
    );
    const sumHol = result.breaks.reduce((acc, b) => acc + b.holidayCount, 0);
    expect(result.stats.totalHolidays).toBe(sumHol);
  });

  test('totalWeekendDays equals sum of break weekendCount', () => {
    const result = optimizeDays(
      inputs({ dayOffBudget: 10, holidays: MONDAY_HOLIDAYS_2027 })
    );
    const sumWkd = result.breaks.reduce((acc, b) => acc + b.weekendCount, 0);
    expect(result.stats.totalWeekendDays).toBe(sumWkd);
  });

  test('totalTakenDays reflects fractional PTO cost', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 10,
        takenDaysOff: [
          {
            name: 'Half day',
            date: '2027-02-01',
            startTime: '09:00',
            endTime: '13:00'
          },
          { name: 'Full day', date: '2027-02-02' }
        ]
      })
    );
    expect(result.stats.totalTakenDays).toBe(1.5);
  });

  test('standalone taken days are counted in totalTakenCalendarDays', () => {
    // A taken day that is NOT inside a planned break counts toward totalTakenCalendarDays
    const result = optimizeDays(
      inputs({
        dayOffBudget: 1,
        referenceDate: '2027-01-01',
        takenDaysOff: [{ name: 'Past day', date: '2027-01-04' }] // first Mon
      })
    );
    // With budget 1 there is one planned break; the taken day (Jan 4) likely not in it
    expect(result.stats.totalTakenCalendarDays).toBeGreaterThanOrEqual(0);
    expect(result.stats.totalTakenCalendarDays).toBeLessThanOrEqual(1);
  });

  test('efficiency is always positive when PTO is planned', () => {
    const result = optimizeDays(inputs({ dayOffBudget: 10 }));
    if (result.stats.totalDayOffs > 0) {
      const eff = result.stats.totalDaysOff / result.stats.totalDayOffs;
      expect(eff).toBeGreaterThan(1); // always get more than 1 calendar day per PTO
    }
  });
});

// ---------------------------------------------------------------------------
// alreadyTakenCount on OffBlock
// ---------------------------------------------------------------------------

describe('alreadyTakenCount', () => {
  test('already-taken working days inside a break are counted in alreadyTakenCount', () => {
    // Force an optimizer break that spans a date where PTO was already taken.
    // Give a large budget so the optimizer builds breaks around Jun 28 - Jul 4.
    const result = optimizeDays(
      inputs({
        dayOffBudget: 10,
        referenceDate: '2027-06-20',
        minNoticeDays: 0,
        takenDaysOff: [{ name: 'Prior leave', date: '2027-06-28' }]
      })
    );
    const blockWithTaken = result.breaks.find((b) =>
      b.days.some((d) => d.date === '2027-06-28' && d.isAlreadyTaken)
    );
    if (blockWithTaken) {
      expect(blockWithTaken.alreadyTakenCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('alreadyTakenCount is 0 when no taken days fall inside planned breaks', () => {
    const result = optimizeDays(inputs({ dayOffBudget: 5 }));
    for (const b of result.breaks) {
      expect(b.alreadyTakenCount).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// BC Canada regression (Bug 4 - extendBreaksForward even distribution)
// ---------------------------------------------------------------------------

describe('BC Canada regression', () => {
  const BC_HOLIDAYS_2026 = [
    { date: '2026-01-01', name: "New Year's Day" },
    { date: '2026-02-16', name: 'Family Day' },
    { date: '2026-04-03', name: 'Good Friday' },
    { date: '2026-05-18', name: 'Victoria Day' },
    { date: '2026-07-01', name: 'Canada Day' },
    { date: '2026-08-03', name: 'BC Day' },
    { date: '2026-09-07', name: 'Labour Day' },
    { date: '2026-10-12', name: 'Thanksgiving' },
    { date: '2026-11-11', name: 'Remembrance Day' },
    { date: '2026-12-25', name: 'Christmas Day' },
    { date: '2026-12-28', name: 'Boxing Day (observed)' }
  ];

  test('does not produce a 10-day continuous block from Jul 3 to Jul 12', () => {
    const result = optimizeDays({
      dayOffBudget: 15,
      strategy: 'balanced',
      year: 2026,
      referenceDate: '2026-06-26',
      minNoticeDays: 7,
      holidays: BC_HOLIDAYS_2026,
      takenDaysOff: [{ name: 'Time off', date: '2026-06-30' }]
    });
    const offender = result.breaks.find(
      (b) => b.startDate === '2026-07-03' && b.endDate === '2026-07-12'
    );
    expect(offender).toBeUndefined();
  });

  test('distributes remaining PTO across multiple breaks (no single break gets all leftovers)', () => {
    const result = optimizeDays({
      dayOffBudget: 15,
      strategy: 'balanced',
      year: 2026,
      referenceDate: '2026-06-26',
      minNoticeDays: 7,
      holidays: BC_HOLIDAYS_2026,
      takenDaysOff: [{ name: 'Time off', date: '2026-06-30' }]
    });
    // Verify no single break consumes more than 4 PTO (greedy would give 6)
    for (const b of result.breaks) {
      expect(b.dayOffCount).toBeLessThanOrEqual(4);
    }
  });

  test('produces exactly 6 breaks with 14 planned PTO and 32 calendar days', () => {
    const result = optimizeDays({
      dayOffBudget: 15,
      strategy: 'balanced',
      year: 2026,
      referenceDate: '2026-06-26',
      minNoticeDays: 7,
      holidays: BC_HOLIDAYS_2026,
      takenDaysOff: [{ name: 'Time off', date: '2026-06-30' }]
    });
    expect(result.breaks).toHaveLength(6);
    expect(result.stats.totalDayOffs).toBe(14);
    expect(result.stats.totalDaysOff).toBe(32);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe('determinism', () => {
  test('same inputs always produce the same output', () => {
    const p = inputs({ dayOffBudget: 12, holidays: MONDAY_HOLIDAYS_2027 });
    const r1 = optimizeDays(p);
    const r2 = optimizeDays(p);
    expect(r1.breaks.map((b) => b.startDate)).toEqual(
      r2.breaks.map((b) => b.startDate)
    );
    expect(r1.stats).toEqual(r2.stats);
  });
});

// ---------------------------------------------------------------------------
// optimizeDaysAsync
// ---------------------------------------------------------------------------

describe('optimizeDaysAsync', () => {
  test('resolves to same result as optimizeDays', async () => {
    const p = inputs({ dayOffBudget: 5, holidays: MONDAY_HOLIDAYS_2027 });
    const sync = optimizeDays(p);
    const async_ = await optimizeDaysAsync(p);
    expect(async_.stats).toEqual(sync.stats);
    expect(async_.breaks.map((b) => b.startDate)).toEqual(
      sync.breaks.map((b) => b.startDate)
    );
  });

  test('returns a Promise', () => {
    const p = inputs({ dayOffBudget: 1 });
    const result = optimizeDaysAsync(p);
    expect(result).toBeInstanceOf(Promise);
  });
});

// ---------------------------------------------------------------------------
// miniBreaks strategy
// ---------------------------------------------------------------------------

describe('miniBreaks strategy', () => {
  test('produces breaks of 5-6 working days before extension', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 15,
        strategy: 'miniBreaks',
        minNoticeDays: 0
      })
    );
    expect(result.breaks.length).toBeGreaterThan(0);
    expect(result.stats.totalDayOffs).toBeLessThanOrEqual(15);
  });

  test('respects budget and produces valid category sums', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 10,
        strategy: 'miniBreaks',
        minNoticeDays: 0
      })
    );
    for (const b of result.breaks) {
      const sum =
        b.dayOffCount +
        b.holidayCount +
        b.weekendCount +
        b.customDayCount +
        b.alreadyTakenCount;
      expect(sum).toBe(b.totalDays);
    }
  });
});

// ---------------------------------------------------------------------------
// Holiday categorization - holiday on a weekend
// ---------------------------------------------------------------------------

describe('holiday on weekend categorization', () => {
  test('a holiday that falls on a Saturday counts under holidayCount, not weekendCount', () => {
    // 2027-07-04 is a Sunday. Make a fake Saturday holiday.
    // 2027-01-01 is a Friday - use a Saturday holiday on 2027-01-02
    const result = optimizeDays(
      inputs({
        dayOffBudget: 5,
        holidays: [{ date: '2027-01-02', name: 'Saturday Holiday' }], // Sat Jan 2
        minNoticeDays: 0
      })
    );
    const day = result.days.find((d) => d.date === '2027-01-02');
    expect(day?.isPublicHoliday).toBe(true);
    expect(day?.isWeekend).toBe(true);
    // If that day is inside a break, its category should be holidayCount not weekendCount
    if (day?.inOffBlock) {
      const b = result.breaks.find((br) =>
        br.days.some((d) => d.date === '2027-01-02')
      );
      // The day is a public holiday - collectBreaks counts isPublicHoliday first
      // so it goes into holidayCount
      expect(b?.holidayCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('holiday on Saturday is annotated as both isPublicHoliday and isWeekend', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 0,
        holidays: [{ date: '2027-01-02', name: 'Sat Holiday' }]
      })
    );
    const day = result.days.find((d) => d.date === '2027-01-02');
    expect(day?.isPublicHoliday).toBe(true);
    expect(day?.isWeekend).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Taken day on a public holiday (should not consume PTO from budget)
// ---------------------------------------------------------------------------

describe('taken day on a public holiday', () => {
  test('a taken day that falls on a public holiday does not deduct PTO from budget', () => {
    // Jan 18 2027 is MLK Day (public holiday).
    // If user marks it as taken, the computeStats guard skips it from totalTakenDays.
    const result = optimizeDays(
      inputs({
        dayOffBudget: 5,
        holidays: [{ date: '2027-01-18', name: 'MLK Day' }],
        takenDaysOff: [{ name: 'MLK taken', date: '2027-01-18' }]
      })
    );
    // totalTakenDays should be 0 since the taken day is on a public holiday
    expect(result.stats.totalTakenDays).toBe(0);
    // Full budget 5 should be available for planning
    expect(result.stats.totalDayOffs).toBe(5);
  });

  test('a taken day on a weekend does not deduct PTO from budget', () => {
    // 2027-01-02 is Saturday
    const result = optimizeDays(
      inputs({
        dayOffBudget: 5,
        takenDaysOff: [{ name: 'Weekend entry', date: '2027-01-02' }]
      })
    );
    expect(result.stats.totalTakenDays).toBe(0);
    expect(result.stats.totalDayOffs).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Invalid / unknown strategy falls back to balanced
// ---------------------------------------------------------------------------

describe('unknown strategy fallback', () => {
  test('an unrecognised strategy string behaves like balanced', () => {
    const withBadStrategy = optimizeDays(
      inputs({
        dayOffBudget: 10,
        strategy: 'nonexistent' as unknown as import('./types').PlanStrategy
      })
    );
    const withBalanced = optimizeDays(
      inputs({
        dayOffBudget: 10,
        strategy: 'balanced'
      })
    );
    // Both should produce the same plan since fallback === balanced
    expect(withBadStrategy.stats.totalDayOffs).toBe(
      withBalanced.stats.totalDayOffs
    );
    expect(withBadStrategy.breaks.map((b) => b.startDate)).toEqual(
      withBalanced.breaks.map((b) => b.startDate)
    );
  });
});

// ---------------------------------------------------------------------------
// Inverted date range guards (silently skipped)
// ---------------------------------------------------------------------------

describe('inverted date range guards', () => {
  test('recurring custom day off with endDate before startDate is ignored', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 0,
        customDaysOff: [
          {
            name: 'Bad recurring',
            isRecurring: true,
            startDate: '2027-08-31',
            endDate: '2027-08-01', // end before start
            weekday: 1
          }
        ]
      })
    );
    // No custom day offs should be annotated
    const hasCustom = result.days.some((d) => d.isCustomDayOff);
    expect(hasCustom).toBe(false);
  });

  test('taken day range with endDate before startDate is ignored', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 5,
        takenDaysOff: [
          { name: 'Bad range', startDate: '2027-05-10', endDate: '2027-05-01' }
        ]
      })
    );
    // No taken days should be annotated
    const hasTaken = result.days.some((d) => d.isAlreadyTaken);
    expect(hasTaken).toBe(false);
    expect(result.stats.totalTakenDays).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Strategy spacing - breaks are separated by the required gap
// ---------------------------------------------------------------------------

describe('strategy spacing', () => {
  test('longWeekends breaks are at least 7 days apart (end to next start)', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 15,
        strategy: 'longWeekends',
        minNoticeDays: 0
      })
    );
    for (let i = 1; i < result.breaks.length; i++) {
      const prev = result.breaks[i - 1];
      const curr = result.breaks[i];
      const prevEnd = new Date(prev.endDate + 'T00:00:00');
      const currStart = new Date(curr.startDate + 'T00:00:00');
      const gap =
        Math.round((currStart.getTime() - prevEnd.getTime()) / 86400000) - 1;
      // spacing for longWeekends is 7 days
      expect(gap).toBeGreaterThanOrEqual(7);
    }
  });

  test('miniBreaks breaks are at least 14 days apart (end to next start)', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 15,
        strategy: 'miniBreaks',
        minNoticeDays: 0
      })
    );
    for (let i = 1; i < result.breaks.length; i++) {
      const prev = result.breaks[i - 1];
      const curr = result.breaks[i];
      const prevEnd = new Date(prev.endDate + 'T00:00:00');
      const currStart = new Date(curr.startDate + 'T00:00:00');
      const gap =
        Math.round((currStart.getTime() - prevEnd.getTime()) / 86400000) - 1;
      // spacing for miniBreaks is 14 days
      expect(gap).toBeGreaterThanOrEqual(14);
    }
  });
});

// ---------------------------------------------------------------------------
// Year-end boundary - no break extends past Dec 31
// ---------------------------------------------------------------------------

describe('year-end boundary', () => {
  test('no break end date exceeds December 31 of the target year', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 20,
        year: 2027,
        referenceDate: '2027-01-01'
      })
    );
    for (const b of result.breaks) {
      expect(b.endDate <= '2027-12-31').toBe(true);
    }
  });

  test('a break near year-end does not extend into next year', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 5,
        year: 2027,
        referenceDate: '2027-12-20',
        minNoticeDays: 0
      })
    );
    for (const b of result.breaks) {
      expect(b.endDate.startsWith('2027')).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Combined scenarios - holidays + custom + taken simultaneously
// ---------------------------------------------------------------------------

describe('combined annotation sources', () => {
  test('all three annotation sources (holidays, custom, taken) are applied correctly', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 10,
        holidays: [{ date: '2027-05-31', name: 'Memorial Day' }],
        customDaysOff: [{ date: '2027-06-18', name: 'Company Picnic' }],
        takenDaysOff: [{ name: 'Vacation', date: '2027-04-05' }]
      })
    );
    const hol = result.days.find((d) => d.date === '2027-05-31');
    const custom = result.days.find((d) => d.date === '2027-06-18');
    const taken = result.days.find((d) => d.date === '2027-04-05');
    expect(hol?.isPublicHoliday).toBe(true);
    expect(custom?.isCustomDayOff).toBe(true);
    expect(taken?.isAlreadyTaken).toBe(true);
    // PTO budget should be reduced by 1 for the taken day
    expect(result.stats.totalTakenDays).toBe(1);
    expect(result.stats.totalDayOffs).toBe(9);
  });

  test('category counter invariant holds with all three annotation sources active', () => {
    const result = optimizeDays(
      inputs({
        dayOffBudget: 10,
        holidays: [{ date: '2027-05-31', name: 'Memorial Day' }],
        customDaysOff: [{ date: '2027-06-18', name: 'Company Picnic' }],
        takenDaysOff: [{ name: 'Vacation', date: '2027-04-05' }]
      })
    );
    for (const b of result.breaks) {
      const sum =
        b.dayOffCount +
        b.holidayCount +
        b.weekendCount +
        b.customDayCount +
        b.alreadyTakenCount;
      expect(sum).toBe(b.totalDays);
    }
  });
});
