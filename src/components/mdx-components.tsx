import Link from 'next/link';
import Image from 'next/image';
import type { MDXComponents } from 'mdx/types';
import {
  isValidElement,
  type AnchorHTMLAttributes,
  type ComponentPropsWithoutRef,
  type ReactNode
} from 'react';
import { CopyButton } from '@/components/blog/copy-button';
import { Highlighter } from '@/components/mdx/highlighter';
import { Annotate } from '@/components/mdx/annotate';
import { Callout } from '@/components/mdx/callout';
import { ArchitectureDiagram } from '@/components/mdx/architecture-diagram';
import { BarChart } from '@/components/mdx/bar-chart';
import { ErDiagram } from '@/components/mdx/er-diagram';
import { FlowchartDiagram } from '@/components/mdx/flowchart-diagram';
import { LineChart } from '@/components/mdx/line-chart';
import { LoopDiagram } from '@/components/mdx/loop-diagram';
import { NestedDiagram } from '@/components/mdx/nested-diagram';
import { PyramidDiagram } from '@/components/mdx/pyramid-diagram';
import { GanttChart } from '@/components/mdx/gantt-chart';
import { MatrixDiagram } from '@/components/mdx/matrix-diagram';
import { RadarChart } from '@/components/mdx/radar-chart';
import { ScatterPlot } from '@/components/mdx/scatter-plot';
import { StateDiagram } from '@/components/mdx/state-diagram';
import { VennDiagram } from '@/components/mdx/venn-diagram';
import { FlowDiagram } from '@/components/mdx/flow-diagram';
import { LaneDiagram } from '@/components/mdx/lane-diagram';
import { LayerStack } from '@/components/mdx/layer-stack';
import { QuadrantDiagram } from '@/components/mdx/quadrant-diagram';
import { SequenceDiagram } from '@/components/mdx/sequence-diagram';
import { TimelineDiagram } from '@/components/mdx/timeline-diagram';
import { TreeDiagram } from '@/components/mdx/tree-diagram';
import { MarginNote } from '@/components/mdx/margin-note';
import { Quote } from '@/components/mdx/quote';
import { References } from '@/components/mdx/references';

type ImageProps = ComponentPropsWithoutRef<typeof Image>;
type PreProps = ComponentPropsWithoutRef<'pre'>;

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children);
  }
  return '';
}

function MdxLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { href, children, ...rest } = props;
  if (!href) return <a {...props} />;

  if (href.startsWith('/') || href.startsWith('#')) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

function MdxImage(props: ImageProps) {
  const { src, alt, width, height } = props;
  if (!src || typeof src !== 'string') return null;

  return (
    <Image
      src={src}
      alt={alt || ''}
      width={Number(width) || 800}
      height={Number(height) || 400}
      className="rounded-lg"
    />
  );
}

interface FigureImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  caption?: ReactNode;
  sourceHref?: string;
  sourceLabel?: string;
  priority?: boolean;
}

function FigureImage({
  src,
  alt,
  width = 800,
  height = 400,
  caption,
  sourceHref,
  sourceLabel,
  priority = false
}: FigureImageProps) {
  return (
    <figure className="mdx-figure">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="rounded-lg"
        priority={priority}
      />
      {(caption || (sourceHref && sourceLabel)) && (
        <figcaption className="mdx-figcaption">
          {caption && <span className="mdx-figcaption-label">{caption}</span>}
          {sourceHref && sourceLabel && (
            <span className="mdx-figcaption-source">
              <span className="mdx-figcaption-source-prefix">Source:</span>
              <a href={sourceHref} target="_blank" rel="noopener noreferrer">
                {sourceLabel}
              </a>
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

interface CiteProps {
  n: number | string;
}

function Cite({ n }: CiteProps) {
  const refId = `ref-${n}`;
  const citeId = `cite-${n}`;

  return (
    <sup id={citeId} className="mdx-cite">
      <a href={`#${refId}`} aria-label={`Jump to reference ${n}`}>
        {n}
      </a>
    </sup>
  );
}

function Acknowledgements({ children }: { children: ReactNode }) {
  return (
    <section className="mdx-acknowledgements" aria-label="Acknowledgements">
      <h2 className="mdx-acknowledgements-heading">Acknowledgements</h2>
      {children}
    </section>
  );
}

function MdxPre(props: PreProps) {
  const code = extractText(props.children);

  return (
    <div className="relative group">
      <CopyButton text={code} />
      <pre {...props} />
    </div>
  );
}

export const mdxComponents: MDXComponents = {
  a: MdxLink,
  img: MdxImage,
  pre: MdxPre,
  Highlighter,
  Acknowledgements,
  Annotate,
  ArchitectureDiagram,
  BarChart,
  Callout,
  Cite,
  ErDiagram,
  FigureImage,
  FlowchartDiagram,
  FlowDiagram,
  GanttChart,
  LaneDiagram,
  LayerStack,
  LineChart,
  LoopDiagram,
  MarginNote,
  MatrixDiagram,
  NestedDiagram,
  PyramidDiagram,
  QuadrantDiagram,
  Quote,
  RadarChart,
  References,
  ScatterPlot,
  SequenceDiagram,
  StateDiagram,
  TimelineDiagram,
  TreeDiagram,
  VennDiagram
};
