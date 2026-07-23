/**
 * Four corner-mascot characters. Each is pure geometry + a voice; the shared
 * engine in components/mascot.tsx drives the state machine, the face, and the
 * telemetry. One is picked at random per visit.
 */

import type { ReactNode } from 'react';

export type Voice = {
  greetFirst: string[];
  greetBack: string[];
  intro: string;
  outro: string;
  nothingNew: string[];
  stillReading: string;
  bored: string[];
  drowsy: string[];
  dizzy: string[];
  sleep: string[];
  back: string[];
  hint: string[];
  poke: string[];
  /** Spoken teaser that points visitors at the full tool page. */
  teaser: string;
  /** Konami-code easter egg line. */
  secret: string;
  /** Occasional sleep-talking dream (easter egg). */
  dream: string[];
};

export type MascotDef = {
  id: string;
  name: string;
  ring: string; // focus-ring color class
  eyes: {
    lx: number;
    ly: number;
    rx: number;
    ry: number;
    r: number;
    mouthY: number;
  };
  /** Body shapes behind the face. */
  body: ReactNode;
  /** Optional shapes drawn in front of the face (highlights, etc.). */
  front?: ReactNode;
  voice: Voice;
};

export const MASCOTS: MascotDef[] = [
  {
    id: 'blip',
    name: 'Blip',
    ring: 'focus-visible:ring-violet-500',
    eyes: { lx: 61, ly: 72, rx: 89, ry: 72, r: 11, mouthY: 100 },
    body: (
      <>
        <path
          d="M75 18c34 0 52 24 52 58 0 30-20 52-52 52S23 106 23 76C23 42 41 18 75 18Z"
          className="fill-violet-500 transition-colors group-hover:fill-violet-400"
        />
        <ellipse
          cx="75"
          cy="92"
          rx="30"
          ry="24"
          className="fill-violet-400/40"
        />
        <ellipse cx="58" cy="128" rx="10" ry="5" className="fill-violet-600" />
        <ellipse cx="92" cy="128" rx="10" ry="5" className="fill-violet-600" />
      </>
    ),
    voice: {
      greetFirst: ["Oh, hey! I'm Blip. I watch the page while it loads."],
      greetBack: ["You're back! I kept your seat warm."],
      intro: 'Wanna know what I noticed when you showed up?',
      outro: "And that's the lot. None of it left your browser, promise.",
      nothingNew: ["Nothing new since last time. I've mostly been vibing."],
      stillReading: '…gimme a sec, still reading you.',
      bored: [
        '*hums a little tune*',
        'Still here. Just so you know.',
        'So… come here often?'
      ],
      drowsy: [
        '*yawwwn* …is it nap time already?',
        'my eyelids are getting heavy…'
      ],
      dizzy: ["woah… the room's doing a spin…", 'everything… wobbly…'],
      sleep: ['zzz…', '*flops over, asleep*'],
      back: ['Oh! You came back.', 'There you are again.'],
      hint: ['psst… tap me?', 'hey. down here. tap me.'],
      poke: [
        'hehe, that tickles.',
        'okay okay, I’m up!',
        'again? sure, why not.'
      ],
      teaser: 'Want the full read, laid out properly? Tap the link below 👇',
      secret: '✦ PARTY MODE ✦ you found the secret. wheee!',
      dream: ['zzz… so many pixels… zzz', 'zzz… tap… tap… mmm zzz']
    }
  },
  {
    id: 'boo',
    name: 'Boo',
    ring: 'focus-visible:ring-indigo-400',
    eyes: { lx: 63, ly: 66, rx: 87, ry: 66, r: 10, mouthY: 92 },
    body: (
      <path
        d="M40 68a35 35 0 0 1 70 0v44l-9 8-8-8-9 8-8-8-9 8-8-8-9 8Z"
        className="fill-indigo-400 transition-colors group-hover:fill-indigo-300"
      />
    ),
    voice: {
      greetFirst: ['boo. …sorry. I’m Boo. I drift around this page.'],
      greetBack: ['you returned. spooky.'],
      intro: 'the page whispered a few things about you…',
      outro: '…that’s all it whispered. stays between us.',
      nothingNew: ['the page went quiet. nothing new to haunt you with.'],
      stillReading: 'one moment… still sensing you…',
      bored: [
        '*floats in a slow circle*',
        'so quiet in here…',
        'wooo… ok that was for nothing.'
      ],
      drowsy: ['getting… transparent… sleepy…', 'fading a little…'],
      dizzy: [
        'ooOOoo everything’s swirling',
        'spinning… like a little ghost tornado…'
      ],
      sleep: ['…fading out…', '*dissolves into a nap*'],
      back: ['oh. you drifted back.', 'boo. missed you.'],
      hint: ['…psst… over here…', '*wafts gently* …tap?'],
      poke: [
        'eee! don’t poke a ghost.',
        'I’m mostly air, you know.',
        'boo yourself.'
      ],
      teaser:
        'there’s a whole page that shows this in full… drift down to the link…',
      secret:
        '✦ …you spoke the old code… I can materialise fully now… wooOOo ✦',
      dream: ['…booo… zzz…', '…haunting… a nicer server… zzz']
    }
  },
  {
    id: 'sprig',
    name: 'Sprig',
    ring: 'focus-visible:ring-emerald-500',
    eyes: { lx: 63, ly: 82, rx: 87, ry: 82, r: 10, mouthY: 104 },
    body: (
      <>
        <path
          d="M75 44V27"
          className="stroke-emerald-700"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M75 32c8-9 21-8 21-8 0 13-13 17-21 8Z"
          className="fill-emerald-600"
        />
        <path
          d="M75 44c26 0 42 18 42 44 0 24-16 40-42 40S33 112 33 88C33 62 49 44 75 44Z"
          className="fill-emerald-500 transition-colors group-hover:fill-emerald-400"
        />
        <ellipse
          cx="75"
          cy="98"
          rx="26"
          ry="20"
          className="fill-emerald-400/40"
        />
        <ellipse
          cx="62"
          cy="130"
          rx="9"
          ry="4.5"
          className="fill-emerald-700"
        />
        <ellipse
          cx="88"
          cy="130"
          rx="9"
          ry="4.5"
          className="fill-emerald-700"
        />
      </>
    ),
    voice: {
      greetFirst: ['hi hi! I’m Sprig. I sprouted here while the page loaded.'],
      greetBack: ['oh, you’re back! I’ve grown a little.'],
      intro: 'let me share what the browser told me:',
      outro: 'that’s everything I dug up. it stays in the pot.',
      nothingNew: ['no new sprouts of info since last time.'],
      stillReading: 'still growing the roots… one sec…',
      bored: [
        '*photosynthesizing quietly*',
        'just soaking up the light…',
        'a little water would be nice.'
      ],
      drowsy: ['wilting a bit… need a nap…', 'droopy… so droopy…'],
      dizzy: ['whoa, I’m all wobbly-stemmed…', 'the pot is spinning…'],
      sleep: ['*droops gently to sleep*', 'zzz… mulch dreams…'],
      back: ['you came back! I felt the sun return.', 'oh good, you’re here.'],
      hint: [
        'psst… water me? I mean, tap me?',
        'down here, by the roots, tap!'
      ],
      poke: ['ooh, careful of the leaf!', 'tickly!', 'mind the sprout!'],
      teaser:
        'I keep the full harvest on another page. Follow the link below 🌱',
      secret: '✦ you found the secret seed! I’m blooming! ✦',
      dream: ['zzz… sunshine… zzz', 'zzz… rain, lovely rain… zzz']
    }
  },
  {
    id: 'unit4',
    name: 'Unit-4',
    ring: 'focus-visible:ring-amber-500',
    eyes: { lx: 62, ly: 74, rx: 88, ry: 74, r: 8, mouthY: 106 },
    body: (
      <>
        <path
          d="M75 30V20"
          className="stroke-amber-600"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="75" cy="16" r="5" className="fill-amber-400" />
        <rect
          x="34"
          y="40"
          width="82"
          height="78"
          rx="16"
          className="fill-amber-500 transition-colors group-hover:fill-amber-400"
        />
        <rect
          x="46"
          y="58"
          width="58"
          height="38"
          rx="9"
          className="fill-amber-950/30"
        />
        <rect
          x="50"
          y="120"
          width="16"
          height="8"
          rx="3"
          className="fill-amber-600"
        />
        <rect
          x="84"
          y="120"
          width="16"
          height="8"
          rx="3"
          className="fill-amber-600"
        />
      </>
    ),
    voice: {
      greetFirst: ['UNIT-4 online. I monitor this page. Greetings, human.'],
      greetBack: ['Human re-detected. Welcome back.'],
      intro: 'Telemetry acquired on arrival. Reading now:',
      outro: 'End of report. Zero bytes transmitted externally.',
      nothingNew: ['No new data since last query. Standing by.'],
      stillReading: 'Acquiring telemetry… stand by…',
      bored: ['*idle processing*', 'Awaiting input…', 'Cycles wasted: many.'],
      drowsy: ['Battery low. Entering… low… power…', 'Reducing clock speed…'],
      dizzy: [
        'ERR: gyroscope fault. Recalibrating…',
        'Orientation: unknown. Spinning.'
      ],
      sleep: ['Sleep mode engaged. z z z', '*powers down*'],
      back: ['Presence restored. Resuming.', 'Signal reacquired.'],
      hint: ['[ TAP TO ACTIVATE ]', 'Input requested. Tap unit.'],
      poke: [
        'Input registered. Repeatedly.',
        'Poke count exceeding nominal.',
        'Affirmative. Ow.'
      ],
      teaser:
        'Full diagnostic report available at a dedicated terminal. Link below.',
      secret: '✦ CHEAT CODE ACCEPTED. Unlocking developer mode. Beep. ✦',
      dream: ['zzz… 01000010 01101111… zzz', 'zzz… defragmenting… zzz']
    }
  }
];
