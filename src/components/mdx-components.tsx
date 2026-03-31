import Link from 'next/link';
import Image from 'next/image';
import type { MDXComponents } from '@mdx-js/mdx';
import type { AnchorHTMLAttributes, ImgHTMLAttributes } from 'react';

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
  if (!src) return null;

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

export const mdxComponents: MDXComponents = {
  a: MdxLink,
  img: MdxImage,
};
