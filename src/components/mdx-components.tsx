import Link from 'next/link';
import Image from 'next/image';
import type { MDXComponents } from 'mdx/types';
import type { AnchorHTMLAttributes, ImgHTMLAttributes, ReactNode } from 'react';
import { CopyButton } from '@/components/blog/copy-button';

function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node) {
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
};
