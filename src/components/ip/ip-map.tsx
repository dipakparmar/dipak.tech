'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin } from 'lucide-react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * OpenFreeMap vector basemap; attribution comes from the style itself. Dark
 * mode inverts the canvas only (see globals.css), so the marker and the
 * attribution keep their colours.
 */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

/** A single-pin map. MapLibre is loaded on mount, so it never ships to pages without a map. */
export function IPMap({
  lat,
  lon,
  label
}: {
  lat: number;
  lon: number;
  label: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  // MapLibre positions this element; React renders the pin into it.
  const [pinEl, setPinEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: MaplibreMap | undefined;
    let cancelled = false;

    (async () => {
      try {
        const maplibregl = await import('maplibre-gl');
        if (cancelled || !container.current) return;
        maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
        map = new maplibregl.Map({
          container: container.current,
          style: STYLE_URL,
          center: [lon, lat],
          zoom: 9,
          attributionControl: { compact: true },
          cooperativeGestures: true
        });
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          'top-right'
        );
        map.on('error', () => setFailed(true));
        // Compact attribution starts expanded; start collapsed to its "i" button.
        map.once('load', () =>
          container.current
            ?.querySelector('.maplibregl-ctrl-attrib')
            ?.classList.remove('maplibregl-compact-show')
        );

        const pin = document.createElement('div');
        setPinEl(pin);
        new maplibregl.Marker({ element: pin })
          .setLngLat([lon, lat])
          .setPopup(
            new maplibregl.Popup({ offset: 16, closeButton: false }).setText(
              label
            )
          )
          .addTo(map);
      } catch {
        setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lon, label]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={container}
        className="h-full w-full"
        aria-label={`Map of ${label}`}
        role="img"
      />
      {pinEl &&
        createPortal(
          <div className="relative flex h-8 w-8 cursor-pointer items-center justify-center">
            <div className="absolute h-8 w-8 animate-ping rounded-full bg-blue-500 opacity-75" />
            <div className="absolute h-8 w-8 rounded-full bg-blue-500/30" />
            <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 shadow-lg">
              <MapPin className="h-4 w-4 text-white" />
            </div>
          </div>,
          pinEl
        )}
      {failed && (
        <p className="absolute inset-x-0 bottom-0 bg-background/80 px-2 py-1 text-xs text-muted-foreground">
          Map tiles could not be loaded.
        </p>
      )}
    </div>
  );
}
