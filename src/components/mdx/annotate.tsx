import type { ReactNode } from 'react';
import {
  ScribbleArrow,
  ScribbleCircle,
  ScribbleHighlight,
} from '@/components/scribble';

type AnnotateType = 'circle' | 'underline' | 'arrow' | 'highlight';

interface AnnotateProps {
  type?: AnnotateType;
  color?: string;
  children: ReactNode;
}

export function Annotate({
  type = 'underline',
  color,
  children,
}: AnnotateProps) {
  if (type === 'circle') {
    return (
      <span className="relative inline-flex items-center justify-center px-[6px] mx-[1px] leading-none align-baseline">
        <span className="relative z-10">{children}</span>
        <ScribbleCircle
          color={color}
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full h-[170%] pointer-events-none overflow-visible"
        />
      </span>
    );
  }

  if (type === 'highlight') {
    return (
      <span className="relative inline-block px-[3px] mx-[1px]">
        <ScribbleHighlight
          color={color}
          className="absolute inset-0 w-full h-full pointer-events-none -z-10 overflow-visible"
        />
        <span className="relative z-10">{children}</span>
      </span>
    );
  }

  if (type === 'arrow') {
    return (
      <span className="inline-flex items-baseline gap-[2px] align-baseline">
        <span>{children}</span>
        <span
          aria-hidden
          className="inline-block w-[28px] h-[14px] translate-y-[1px]"
        >
          <ScribbleArrow color={color} className="w-full h-full overflow-visible" />
        </span>
      </span>
    );
  }

  if (color) {
    return (
      <span
        className="scribble-underline-text"
        style={{
          backgroundImage: buildUnderlineSvg(color),
        }}
      >
        {children}
      </span>
    );
  }

  return <span className="scribble-underline-text">{children}</span>;
}

function buildUnderlineSvg(color: string): string {
  const stroke = encodeURIComponent(color);
  return `url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 7' preserveAspectRatio='none'%3E%3Cpath d='M 1 3 C 5 1, 11 4.5, 17 2.5 S 30 5, 37 2.5 S 51 1.5, 58 4 S 73 5, 81 2.5 S 93 4.5, 99 3' stroke='${stroke}' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' fill='none' opacity='0.92'/%3E%3Cpath d='M 2 4.5 C 7 3, 14 5.5, 22 4 S 34 5.5, 42 4.5 S 54 3.5, 62 5 S 77 6, 85 4.5 S 95 5.5, 99 4.2' stroke='${stroke}' stroke-width='1' stroke-linecap='round' fill='none' opacity='0.5'/%3E%3C/svg%3E")`;
}
