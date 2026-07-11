'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Copy,
  Download,
  Info,
  ListChecks,
  Share2,
  Sparkles
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  HapticButton,
  HapticTabsTrigger as TabsTrigger
} from '@/components/haptic-wrappers';
import { CalendarView } from './calendar-view';
import { BreakCard } from './break-card';
import { SubscribeCalendarButton } from './subscribe-calendar-button';
import { breaksToICS, downloadICS } from '@/lib/timeoff-optimizer/ics';
import type { PlanResult } from '@/lib/timeoff-optimizer/types';

type ShareExportAction = 'idle' | 'copied' | 'exported';

const SHARE_EXPORT_LABELS: Record<ShareExportAction, string> = {
  idle: 'Share & export',
  copied: 'Link copied!',
  exported: 'Exported!'
};

interface ResultsDisplayProps {
  result: PlanResult;
  year: number;
  ptoBudget: number;
  shareUrl: string;
  isStale?: boolean;
  /** Whether the owner has configured TIMEOFF_OPTIMIZER_ICS_TOKEN; gates whether the Subscribe button exists at all. */
  icsSubscribeEnabled?: boolean;
  /** Custom title/notes templates for calendar events; supports {days} {pto} {holidays} {weekends} {company} {start} {end} {year} {names}. */
  eventTitleTemplate?: string;
  eventNotesTemplate?: string;
}

export function ResultsDisplay({
  result,
  year,
  ptoBudget,
  shareUrl,
  isStale,
  icsSubscribeEnabled,
  eventTitleTemplate,
  eventNotesTemplate
}: ResultsDisplayProps) {
  const [shareExportAction, setShareExportAction] =
    React.useState<ShareExportAction>('idle');
  const { breaks, stats, days } = result;
  const totalPtoUsed = stats.totalDayOffs + stats.totalTakenDays;
  const totalCalendarDaysOff =
    stats.totalDaysOff + stats.totalTakenCalendarDays;
  const efficiency =
    totalPtoUsed > 0 ? (totalCalendarDaysOff / totalPtoUsed).toFixed(2) : '0';

  const flashAction = (action: ShareExportAction) => {
    setShareExportAction(action);
    setTimeout(() => setShareExportAction('idle'), 2000);
  };

  const handleExport = () => {
    const ics = breaksToICS(
      breaks,
      `Time off ${year}`,
      eventTitleTemplate,
      eventNotesTemplate
    );
    downloadICS(`timeoff-${year}.ics`, ics);
    flashAction('exported');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      flashAction('copied');
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 px-4">
        {isStale && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-md border border-dashed border-primary/50 bg-primary/10 px-3 py-2.5 text-xs font-medium text-foreground"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="text-foreground">
                Inputs changed since this plan was generated.
              </p>
              <p className="text-muted-foreground">
                Click{' '}
                <span className="font-semibold text-foreground">
                  Optimize my time off
                </span>{' '}
                to refresh.
              </p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">
              Your optimized {year} plan
            </h2>
            <p className="text-xs text-muted-foreground">
              {breaks.length} break{breaks.length === 1 ? '' : 's'} ·{' '}
              {stats.totalDaysOff} days off ·{' '}
              {stats.totalDayOffs + stats.totalTakenDays}/{ptoBudget} PTO used
              {stats.totalTakenDays > 0 && (
                <span className="text-amber-500">
                  {' '}
                  ({stats.totalTakenDays} already taken)
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <HapticButton variant="outline" size="sm">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={shareExportAction}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.15 }}
                      className="inline-flex items-center gap-1.5"
                    >
                      {shareExportAction === 'idle' ? (
                        <Share2 className="size-3" />
                      ) : (
                        <Check className="size-3" />
                      )}
                      {SHARE_EXPORT_LABELS[shareExportAction]}
                    </motion.span>
                  </AnimatePresence>
                </HapticButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="size-3" />
                  Copy plan link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="size-3" />
                  Export .ics
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <SubscribeCalendarButton
              enabled={Boolean(icsSubscribeEnabled)}
              shareUrl={shareUrl}
              year={year}
            />
          </div>
        </div>

        <Tabs defaultValue="calendar">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calendar" className="gap-1.5">
              <CalendarDays className="size-3" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="breaks" className="gap-1.5">
              <ListChecks className="size-3" /> Breaks
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5">
              <Sparkles className="size-3" /> Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="pt-4">
            <CalendarView days={days} year={year} />
          </TabsContent>

          <TabsContent value="breaks" className="pt-4">
            {breaks.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground">
                No breaks generated. Try a different strategy or add more PTO
                days.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {breaks.map((br, idx) => (
                  <BreakCard
                    key={`${br.startDate}-${idx}`}
                    break={br}
                    index={idx}
                    titleTemplate={eventTitleTemplate}
                    notesTemplate={eventNotesTemplate}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="stats" className="pt-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile
                label="Total days off"
                value={stats.totalDaysOff}
                accent="text-primary"
              />
              <StatTile
                label="PTO used"
                value={`${totalPtoUsed} / ${ptoBudget}`}
                hint={
                  stats.totalTakenDays > 0
                    ? `${stats.totalDayOffs} planned + ${stats.totalTakenDays} taken`
                    : undefined
                }
              />
              <StatTile
                label="Efficiency"
                value={`${efficiency}x`}
                hint="Calendar days per PTO day"
                accent="text-primary"
                tooltip={
                  <span>
                    {totalCalendarDaysOff} calendar days off &divide;{' '}
                    {totalPtoUsed} PTO days used
                    {stats.totalTakenDays > 0 && (
                      <>
                        <br />
                        <span className="opacity-75">
                          Days off: {stats.totalDaysOff} planned +{' '}
                          {stats.totalTakenCalendarDays} taken
                          <br />
                          PTO: {stats.totalDayOffs} planned +{' '}
                          {stats.totalTakenDays} taken
                        </span>
                      </>
                    )}
                  </span>
                }
              />
              {stats.totalTakenDays > 0 && (
                <StatTile
                  label="Already taken"
                  value={stats.totalTakenDays}
                  hint="PTO days deducted"
                  accent="text-amber-500"
                />
              )}
              <StatTile
                label="Public holidays"
                value={stats.totalHolidays}
                accent="text-accent-green"
              />
              <StatTile label="Weekend days" value={stats.totalWeekendDays} />
              <StatTile
                label="Company days off"
                value={stats.totalCustomDays}
                accent="text-accent-blue"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface StatTileProps {
  label: string;
  value: number | string;
  hint?: string;
  tooltip?: React.ReactNode;
  accent?: string;
}

function StatTile({ label, value, hint, tooltip, accent }: StatTileProps) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
      <div className="flex items-center gap-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="size-2.5 cursor-help text-muted-foreground/60" />
            </TooltipTrigger>
            <TooltipContent className="max-w-56 text-[11px]">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${accent ?? ''}`}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
