'use client';

import * as React from 'react';
import { MapPin, Trash2 } from 'lucide-react';

import { HapticButton } from '@/components/haptic-wrappers';
import { Label } from '@/components/ui/label';
import { CountryCombobox } from './country-combobox';
import type { Location } from '@/lib/timeoff-optimizer/types';

interface LocationRowProps {
  location: Location;
  index: number;
  countries: Array<{ countryCode: string; name: string }>;
  states: Array<{ code: string; name: string }> | undefined;
  regions: Array<{ code: string; name: string }> | undefined;
  isLoadingCountries: boolean;
  isLoadingStates: boolean;
  isLoadingRegions: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<Omit<Location, 'id'>>) => void;
  onRemove: () => void;
}

export function LocationRow({
  location,
  index,
  countries,
  states,
  regions,
  isLoadingCountries,
  isLoadingStates,
  isLoadingRegions,
  canRemove,
  onChange,
  onRemove
}: LocationRowProps) {
  const countryItems = React.useMemo(
    () => countries.map((c) => ({ value: c.countryCode, label: c.name })),
    [countries]
  );
  const stateItems = React.useMemo(
    () => (states ?? []).map((s) => ({ value: s.code, label: s.name })),
    [states]
  );
  const regionItems = React.useMemo(
    () => (regions ?? []).map((r) => ({ value: r.code, label: r.name })),
    [regions]
  );

  const hasStates = !!location.country && (states?.length ?? 0) > 0;
  const hasRegions = !!location.state && (regions?.length ?? 0) > 0;

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/30 p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <MapPin className="size-3" />
          Location {index + 1}
        </div>
        {canRemove && (
          <HapticButton
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label={`Remove location ${index + 1}`}
          >
            <Trash2 className="size-3.5" />
          </HapticButton>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Country</Label>
        <CountryCombobox
          items={countryItems}
          value={location.country}
          onValueChange={(v) =>
            onChange({ country: v, state: null, region: null })
          }
          placeholder={
            isLoadingCountries ? 'Loading countries...' : 'Pick a country'
          }
          disabled={isLoadingCountries}
          emptyMessage="No countries match"
        />
      </div>

      {location.country && (isLoadingStates || hasStates) && (
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">
            State / Province {isLoadingStates ? '(loading...)' : '(optional)'}
          </Label>
          <CountryCombobox
            items={stateItems}
            value={location.state}
            onValueChange={(v) => onChange({ state: v, region: null })}
            placeholder={isLoadingStates ? 'Loading...' : 'Pick a state'}
            disabled={isLoadingStates}
            emptyMessage="No states found"
          />
        </div>
      )}

      {location.country &&
        location.state &&
        (isLoadingRegions || hasRegions) && (
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">
              Region {isLoadingRegions ? '(loading...)' : '(optional)'}
            </Label>
            <CountryCombobox
              items={regionItems}
              value={location.region}
              onValueChange={(v) => onChange({ region: v })}
              placeholder={isLoadingRegions ? 'Loading...' : 'Pick a region'}
              disabled={isLoadingRegions}
              emptyMessage="No regions found"
            />
          </div>
        )}
    </div>
  );
}
