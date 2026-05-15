import type { CSSProperties } from 'react';

interface ScribbleProps {
  color?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_COLOR = '#FFE066';

export function ScribbleCircle({
  color = DEFAULT_COLOR,
  className,
  style,
}: ScribbleProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 60 28"
      preserveAspectRatio="none"
      className={className}
      style={style}
    >
      <path
        d="M 32 5 C 17 4, 6 9, 5 14 C 4 21, 17 25, 32 24 C 47 24, 56 20, 55 13 C 54 7, 40 3, 26 4 C 18 5, 11 8, 8 12"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.92"
      />
      <path
        d="M 30 4 C 16 6, 8 11, 8 15 C 7 22, 20 25, 32 25"
        stroke={color}
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
    </svg>
  );
}

interface ScribbleUnderlineProps extends ScribbleProps {
  drawOnGroupHover?: boolean;
}

export function ScribbleUnderline({
  color = DEFAULT_COLOR,
  className,
  style,
  drawOnGroupHover = false,
}: ScribbleUnderlineProps) {
  const strokeClass = drawOnGroupHover ? 'scribble-stroke--draw' : 'scribble-stroke';
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 7"
      preserveAspectRatio="none"
      className={className}
      style={style}
    >
      <path
        d="M 1 3 C 5 1, 11 4.5, 17 2.5 S 30 5, 37 2.5 S 51 1.5, 58 4 S 73 5, 81 2.5 S 93 4.5, 99 3"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.92"
        className={strokeClass}
      />
      <path
        d="M 2 4.5 C 7 3, 14 5.5, 22 4 S 34 5.5, 42 4.5 S 54 3.5, 62 5 S 77 6, 85 4.5 S 95 5.5, 99 4.2"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
        className={strokeClass}
      />
    </svg>
  );
}

export function ScribbleArrow({
  color = DEFAULT_COLOR,
  className,
  style,
}: ScribbleProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 60 30"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={style}
    >
      <path
        d="M 3 22 C 13 19, 27 13, 49 9"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.92"
      />
      <path
        d="M 49 9 L 41 6 M 49 9 L 44 16"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.92"
      />
    </svg>
  );
}

export function ScribbleHighlight({
  color = DEFAULT_COLOR,
  className,
  style,
}: ScribbleProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 16"
      preserveAspectRatio="none"
      className={className}
      style={style}
    >
      <path
        d="M 1 4 C 25 2, 50 5, 99 3 L 99 13 C 75 14, 50 12, 1 13 Z"
        fill={color}
        opacity="0.55"
      />
    </svg>
  );
}
