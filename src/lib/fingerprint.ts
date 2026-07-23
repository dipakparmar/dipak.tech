/**
 * Browser fingerprint collection. Every value comes from a standard browser
 * API, read once, client-side. Used by both the tools page and the corner
 * mascot. Prose is original.
 */

import {
  Accessibility,
  BatteryMedium,
  Clock,
  Cpu,
  Film,
  HardDrive,
  Link2,
  type LucideIcon,
  MapPin,
  MemoryStick,
  Monitor,
  Palette,
  Pointer,
  SlidersHorizontal,
  Type,
  Wifi
} from 'lucide-react';

export type Signal = {
  /** Short heading, e.g. "Location". */
  label: string;
  /** The raw value shown to the user. */
  datum: string;
  /** Neutral, factual one-liner for the tool card. */
  note: string;
  /** Short, casual line the mascot says. */
  chat: string;
  /** Icon shown on the tool dashboard tile. */
  icon: LucideIcon;
};

function detectOS(ua: string, touchPoints: number): string {
  if (
    /iphone|ipad|ipod/.test(ua) ||
    (ua.includes('macintosh') && touchPoints > 1)
  )
    return 'iOS';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('mac')) return 'macOS';
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('cros')) return 'ChromeOS';
  if (ua.includes('linux')) return 'Linux';
  return 'an unknown OS';
}

function detectBrowser(ua: string): string {
  if (ua.includes('fxios') || ua.includes('firefox')) return 'Firefox';
  if (ua.includes('edgios') || ua.includes('edg/')) return 'Edge';
  if (ua.includes('crios')) return 'Chrome';
  if (ua.includes('opr') || ua.includes('opera')) return 'Opera';
  if (ua.includes('brave')) return 'Brave';
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('safari')) return 'Safari';
  return 'your browser';
}

type ExtNav = Navigator & {
  deviceMemory?: number;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    saveData?: boolean;
  };
};

export async function collectSignals(): Promise<Signal[]> {
  const nav = navigator;
  const ext = nav as ExtNav;
  const scr = screen;
  const ua = nav.userAgent.toLowerCase();
  const touch = nav.maxTouchPoints || 0;
  const out: Signal[] = [];

  const os = detectOS(ua, touch);
  const browser = detectBrowser(ua);
  const device =
    touch > 0 && scr.width < 768
      ? 'phone'
      : touch > 0 && scr.width < 1200
        ? 'tablet'
        : 'desktop';

  out.push({
    label: 'Device',
    datum: `${browser} on ${os}, ${scr.width}×${scr.height} at ${window.devicePixelRatio}x`,
    note: `Sent in the User-Agent header on the first request: ${device}-class hardware, ${scr.colorDepth}-bit color.`,
    chat: `You're on ${browser}, ${os}, ${scr.width}×${scr.height}. Nice ${device}.`,
    icon: Monitor
  });

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
  const langs = nav.languages?.length
    ? Array.from(nav.languages)
    : [nav.language];
  out.push({
    label: 'Time & language',
    datum: `${tz}, ${langs.join(', ')}`,
    note: `Read from your system clock and Accept-Language header, a rough locale and time-of-day signal.`,
    chat: `Clock's set to ${tz}, and you read ${langs[0]}. Handy to know.`,
    icon: Clock
  });

  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
    const gpu = dbg && gl?.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
    if (gpu && String(gpu).length > 3) {
      out.push({
        label: 'Graphics',
        datum: String(gpu),
        note: `Reported by the WebGL renderer string. A strong per-device identifier alongside other signals.`,
        chat: `And your graphics chip? ${String(gpu)}. That one's practically a name tag.`,
        icon: Cpu
      });
    }
  } catch {}

  const testFonts = [
    'Helvetica Neue',
    'Georgia',
    'Comic Sans MS',
    'Impact',
    'Palatino',
    'Garamond',
    'Futura',
    'Gill Sans',
    'Menlo',
    'Consolas',
    'Cambria',
    'Tahoma'
  ];
  const probe = document.createElement('span');
  probe.style.cssText =
    'position:absolute;left:-9999px;font-size:72px;visibility:hidden';
  probe.textContent = 'mmmmmmmmlli';
  document.body.appendChild(probe);
  probe.style.fontFamily = 'monospace';
  const baseW = probe.offsetWidth;
  const installed = testFonts.filter((f) => {
    probe.style.fontFamily = `"${f}",monospace`;
    return probe.offsetWidth !== baseW;
  });
  document.body.removeChild(probe);
  if (installed.length) {
    out.push({
      label: 'Fonts',
      datum: installed.join(', '),
      note: `Detected by measuring rendered text width, no prompt. The installed set skews unique on desktop.`,
      chat: `You've got ${installed.length} of the fonts I checked for, including ${installed[0]}.`,
      icon: Type
    });
  }

  try {
    const anyNav = nav as Navigator & {
      getBattery?: () => Promise<{ level: number; charging: boolean }>;
    };
    if (anyNav.getBattery) {
      const b = await anyNav.getBattery();
      if (Number.isFinite(b.level)) {
        out.push({
          label: 'Battery',
          datum: `${Math.round(b.level * 100)}%, ${b.charging ? 'charging' : 'on battery'}`,
          note: `Exposed by the Battery Status API on browsers that still ship it, a short-lived cross-site signal.`,
          chat: `Battery's at ${Math.round(b.level * 100)}%${b.charging ? ', and plugged in' : ''}. Just saying.`,
          icon: BatteryMedium
        });
      }
    }
  } catch {}

  const dark = matchMedia('(prefers-color-scheme:dark)').matches;
  const dnt = nav.doNotTrack === '1' || nav.doNotTrack === 'yes';
  out.push({
    label: 'Preferences',
    datum: `${nav.cookieEnabled ? 'Cookies on' : 'Cookies off'}, ${dark ? 'Dark mode' : 'Light mode'}${dnt ? ', Do Not Track' : ''}`,
    note: `Cookie support, color-scheme, and tracking preference. Each one narrows the field a little further.`,
    chat: `You like ${dark ? 'dark mode' : 'light mode'}${dnt ? ", and you asked not to be tracked (I'll behave)" : ''}.`,
    icon: SlidersHorizontal
  });

  // CPU and memory
  if (nav.hardwareConcurrency) {
    const mem = ext.deviceMemory;
    out.push({
      label: 'CPU & memory',
      datum: mem
        ? `${nav.hardwareConcurrency} cores, ${mem} GB RAM`
        : `${nav.hardwareConcurrency} logical cores`,
      note: `Plain navigator properties, no prompt. Core count and RAM tier sort visitors into a few hardware buckets.`,
      chat: `You've got ${nav.hardwareConcurrency} cores${mem ? ` and about ${mem} GB of RAM` : ''}. Roomy.`,
      icon: MemoryStick
    });
  }

  // Pointer and hover
  {
    const fine = matchMedia('(pointer: fine)').matches;
    const hover = matchMedia('(hover: hover)').matches;
    out.push({
      label: 'Pointer',
      datum: `${touch > 0 ? `${touch} touch points, ` : ''}${fine ? 'fine' : 'coarse'} pointer${hover ? ', hover' : ''}`,
      note: `Pointer and hover media queries reveal whether you use a touchscreen or a precise pointer, which separates phones from desktops.`,
      chat:
        touch > 0
          ? `A tappy-screen person, I see.`
          : `Mouse person. Precise. I respect it.`,
      icon: Pointer
    });
  }

  // Network Information (Chromium only)
  if (ext.connection?.effectiveType) {
    const c = ext.connection;
    out.push({
      label: 'Network',
      datum: `${c.effectiveType}${c.downlink ? `, ${c.downlink} Mbps down` : ''}${c.saveData ? ', save-data on' : ''}`,
      note: `The Network Information API estimates connection quality client-side, without touching the network itself.`,
      chat: `Your connection reads as ${c.effectiveType}. Noted.`,
      icon: Wifi
    });
  }

  // Color and display capability
  {
    const p3 = matchMedia('(color-gamut: p3)').matches;
    const hdr = matchMedia('(dynamic-range: high)').matches;
    out.push({
      label: 'Color & display',
      datum: `${scr.colorDepth}-bit${p3 ? ', P3 gamut' : ', sRGB'}${hdr ? ', HDR' : ''}`,
      note: `Screen properties and color media queries expose your panel's color range and HDR support, which map to display tiers.`,
      chat: `Your screen does ${p3 ? 'the wide fancy colors' : 'standard colors'}${hdr ? ' and HDR' : ''}.`,
      icon: Palette
    });
  }

  // Accessibility preferences
  {
    const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hc = matchMedia('(prefers-contrast: more)').matches;
    const fc = matchMedia('(forced-colors: active)').matches;
    const bits = [
      rm ? 'reduced motion' : 'normal motion',
      hc ? 'more contrast' : 'normal contrast'
    ];
    if (fc) bits.push('forced colors');
    out.push({
      label: 'Motion & contrast',
      datum: bits.join(', '),
      note: `Accessibility media queries surface OS-level settings that most people never change from the default.`,
      chat: `You like it ${rm ? 'calm and still' : 'with a little motion'}. Got it.`,
      icon: Accessibility
    });
  }

  // Media codec support
  {
    const v = document.createElement('video');
    const can = (t: string) => v.canPlayType(t) !== '';
    const codecs = [
      ['H.264', can('video/mp4; codecs="avc1.42E01E"')],
      ['VP9', can('video/webm; codecs="vp9"')],
      ['AV1', can('video/mp4; codecs="av01.0.05M.08"')],
      ['HEVC', can('video/mp4; codecs="hev1.1.6.L93.B0"')]
    ]
      .filter(([, ok]) => ok)
      .map(([n]) => n as string);
    if (codecs.length) {
      out.push({
        label: 'Media codecs',
        datum: codecs.join(', '),
        note: `Codec probes report which video formats your browser and OS can decode, a set that shifts by platform and build.`,
        chat: `You can play ${codecs.join(', ')}. Movie night ready.`,
        icon: Film
      });
    }
  }

  // Storage quota (Chromium and Firefox)
  try {
    if (nav.storage?.estimate) {
      const est = await nav.storage.estimate();
      if (est.quota) {
        const gb = est.quota / 1024 / 1024 / 1024;
        const val =
          gb >= 1
            ? `${gb >= 10 ? Math.round(gb) : gb.toFixed(1)} GB`
            : `${Math.round(est.quota / 1024 / 1024)} MB`;
        out.push({
          label: 'Storage quota',
          datum: `about ${val} offered`,
          note: `The Storage API reports an origin storage budget derived from your free disk space, which helps tell devices apart.`,
          chat: `Peeked at your storage, about ${val} free for this site.`,
          icon: HardDrive
        });
      }
    }
  } catch {}

  if (document.referrer) {
    let ref = document.referrer;
    try {
      ref = new URL(document.referrer).hostname;
    } catch {}
    out.push({
      label: 'Came from',
      datum: ref,
      note: `The Referer header names the site that linked you here.`,
      chat: `Oh, and you got here from ${ref}. The internet gossips.`,
      icon: Link2
    });
  }

  // IP geolocation, reuses the existing /api/ip route; server keeps nothing
  // beyond its short cache. Prepended so location leads when it resolves.
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const r = await fetch('/api/ip?details=true', { signal: ctrl.signal });
    clearTimeout(timer);
    if (r.ok) {
      const j = await r.json();
      if (j.city && j.status !== 'fail') {
        const ip = String(j.ip || '');
        const masked = ip.includes('.')
          ? ip.replace(/^(\d+)\.\d+\.\d+\.(\d+)$/, '$1.xxx.xxx.$2')
          : ip;
        const place = [j.city, j.regionName, j.country]
          .filter(Boolean)
          .join(', ');
        out.unshift({
          label: 'Location',
          datum: place,
          note: `Resolved from your IP (${masked}) to a city and network (${j.isp}). Only the masked address is shown.`,
          chat: `I think you're near ${j.city}. Your IP (${masked}) gave it away.`,
          icon: MapPin
        });
      }
    }
  } catch {}

  return out;
}
