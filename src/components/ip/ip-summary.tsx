'use client';

import type { ReactNode } from 'react';
import { Check, Copy, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Map, MapMarker, MapPopup, MapTileLayer } from '@/components/ui/map';
import { Pill } from '@/components/osint/pills';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { normalizePathname } from '@/lib/host-routing';
import { cn } from '@/lib/utils';
import type { IPResponse } from '@/types/ip';

function flag(cc: string | undefined) {
  return cc && /^[a-z]{2}$/i.test(cc)
    ? cc
        .toUpperCase()
        .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    : '';
}

function localTime(timeZone: string | undefined) {
  if (!timeZone) return null;
  try {
    return new Date().toLocaleTimeString('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return null;
  }
}

function lookupHref(target: string) {
  const host = typeof window === 'undefined' ? '' : window.location.host;
  return `${normalizePathname('tools', '/tools/ip', host)}?target=${encodeURIComponent(target)}`;
}

/** One card for a single IP: identity, flags, location, network, and a small map. */
export function IPSummary({
  data: d,
  own
}: {
  data: IPResponse;
  own: boolean;
}) {
  const { copied, copy } = useCopyToClipboard();
  const asn = d.as?.match(/^AS(\d+)/i)?.[1];
  const place = [
    d.city,
    [d.regionName, d.zip].filter(Boolean).join(' '),
    d.country
  ]
    .filter(Boolean)
    .join(', ');
  const time = localTime(d.timezone);
  const hasMap = d.lat !== undefined && d.lon !== undefined;

  return (
    <Card className="mb-4 gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {own ? 'Your IP address' : 'IP address'}
        </span>
        <h2 className="font-mono text-2xl font-bold break-all">{d.ip}</h2>
        <button
          type="button"
          onClick={() => copy(d.ip ?? '')}
          aria-label={copied ? 'Copied' : 'Copy IP address'}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
        <div className="flex flex-wrap gap-1">
          {d.ip_type && <Pill>{d.ip_type}</Pill>}
          {d.hosting && (
            <Pill tone="info" title="Datacenter, hosting provider or VPN range">
              Hosting / datacenter
            </Pill>
          )}
          {d.proxy && (
            <Pill tone="warn" title="Known proxy, VPN or Tor exit">
              Proxy
            </Pill>
          )}
          {d.mobile && <Pill title="Cellular network">Mobile</Pill>}
          {!d.hosting && !d.proxy && !d.mobile && (
            <Pill tone="good">No proxy, hosting or mobile flags</Pill>
          )}
        </div>
      </div>

      <div className={cn('grid gap-4', hasMap && 'lg:grid-cols-5')}>
        <dl className="grid grid-cols-1 content-start gap-x-6 gap-y-3 sm:grid-cols-2 lg:col-span-3">
          <Fact label="Location">
            {place && (
              <>
                <span className="mr-1">{flag(d.countryCode)}</span>
                {place}
              </>
            )}
          </Fact>
          <Fact label="Timezone">
            {d.timezone && (
              <>
                {d.timezone}
                {time && (
                  <span className="text-muted-foreground"> · {time} now</span>
                )}
              </>
            )}
          </Fact>
          <Fact label="ISP">{d.isp}</Fact>
          <Fact label="Organization">
            {d.org && d.org !== d.isp ? d.org : null}
          </Fact>
          <Fact label="ASN">
            {d.as &&
              (asn ? (
                <a
                  href={lookupHref(`AS${asn}`)}
                  className="text-primary hover:underline"
                >
                  {d.as}
                </a>
              ) : (
                d.as
              ))}
            {d.asname && (
              <span className="text-muted-foreground"> · {d.asname}</span>
            )}
          </Fact>
          <Fact label="Coordinates">
            {hasMap && (
              <span className="font-mono text-xs">
                {d.lat?.toFixed(4)}, {d.lon?.toFixed(4)}
              </span>
            )}
          </Fact>
          <Fact label="Reverse DNS" wide>
            {d.reverse && (
              <span className="font-mono text-xs break-all">{d.reverse}</span>
            )}
          </Fact>
        </dl>

        {hasMap && (
          <div className="h-56 self-start overflow-hidden rounded-md border lg:col-span-2">
            <Map center={[d.lat!, d.lon!]} zoom={9} className="rounded-md">
              <MapTileLayer />
              <MapMarker
                position={[d.lat!, d.lon!]}
                icon={
                  <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 shadow-lg">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                }
                iconAnchor={[12, 12]}
              >
                <MapPopup>
                  <div className="space-y-0.5 text-xs">
                    <div className="font-mono font-semibold">{d.ip}</div>
                    <div>{place}</div>
                    {d.isp && (
                      <div className="text-muted-foreground">{d.isp}</div>
                    )}
                  </div>
                </MapPopup>
              </MapMarker>
            </Map>
          </div>
        )}
      </div>
    </Card>
  );
}

function Fact({
  label,
  children,
  wide
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!children) return null;
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}
