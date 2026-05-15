import Link from 'next/link';
import Image from 'next/image';
import type { MDXComponents } from 'mdx/types';
import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react';
import { CopyButton } from '@/components/blog/copy-button';
import { Annotate } from '@/components/mdx/annotate';
import { MarginNote } from '@/components/mdx/margin-note';

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node) {
    return extractText((node as any).props.children);
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

function MdxImage(props: ImgHTMLAttributes<HTMLImageElement>) {
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
  priority = false,
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

  return (
    <sup className="mdx-cite">
      <a href={`#${refId}`} aria-label={`Jump to reference ${n}`}>
        [{n}]
      </a>
    </sup>
  );
}

interface ReferenceItem {
  href: string;
  label: ReactNode;
}

interface ReferencesProps {
  items: ReferenceItem[];
}

function References({ items }: ReferencesProps) {
  return (
    <ol className="mdx-references">
      {items.map((item, index) => {
        const n = index + 1;
        return (
          <li key={`${n}-${item.href}`} id={`ref-${n}`}>
            <a href={item.href} target="_blank" rel="noopener noreferrer">
              {item.label}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

function MdxPre(props: any) {
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
  Annotate,
  Cite,
  FigureImage,
  MarginNote,
  References,
};
