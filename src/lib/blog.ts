import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { compile, run } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';
import { createHighlighter } from 'shiki';
import type { ComponentType } from 'react';
import type { MDXComponents } from 'mdx/types';

const BLOG_DIR = path.join(process.cwd(), 'content/blog');
const WORDS_PER_MINUTE = 200;

export interface PostFrontmatter {
  title: string;
  description: string;
  date: string;
  updated?: string;
  tags: string[];
  image?: string;
  draft?: boolean;
}

export interface PostMeta extends PostFrontmatter {
  slug: string;
  readingTime: number;
}

export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

export interface Post {
  meta: PostMeta;
  content: ComponentType<{ components?: MDXComponents }>;
  toc: TocEntry[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

function createUniqueSlugger() {
  const counts = new Map<string, number>();

  return (text: string) => {
    const base = slugify(text);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

function computeReadingTime(content: string): number {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

function extractToc(content: string): TocEntry[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const entries: TocEntry[] = [];
  const getUniqueSlug = createUniqueSlugger();
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    entries.push({
      id: getUniqueSlug(match[2]),
      text: match[2],
      level: match[1].length,
    });
  }
  return entries;
}

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [
        'typescript', 'javascript', 'bash', 'go', 'python', 'yaml', 'json',
        'tsx', 'jsx', 'css', 'html', 'dockerfile', 'sql', 'rust', 'markdown',
      ],
    });
  }
  return highlighterPromise;
}

function rehypeShiki() {
  return async (tree: any) => {
    const highlighter = await getHighlighter();
    const { visit, SKIP } = await import('unist-util-visit');

    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'pre') return;
      const codeNode = node.children?.[0];
      if (!codeNode || codeNode.tagName !== 'code') return;

      const className = codeNode.properties?.className?.[0] || '';
      const langMatch = className.match(/language-(\w+)/);
      const lang = langMatch ? langMatch[1] : 'text';

      const code = codeNode.children
        ?.map((child: any) => child.value || '')
        .join('')
        .replace(/\n$/, '');

      const hast = highlighter.codeToHast(code, {
        lang,
        themes: { light: 'github-light', dark: 'github-dark' },
      });

      // codeToHast returns a root with a single <pre> child
      const preNode = hast.children[0] as any;

      // For shell languages, mark each line as command or comment/empty
      const shellLangs = ['shell', 'bash', 'sh', 'zsh', 'terminal'];
      if (shellLangs.includes(lang)) {
        const codeEl = preNode.children?.find((c: any) => c.tagName === 'code');
        if (codeEl) {
          for (const line of codeEl.children) {
            if (line.tagName !== 'span' || !line.properties?.className?.includes('line')) continue;
            const text = (line.children || [])
              .map((c: any) => c.children?.[0]?.value || c.value || '')
              .join('')
              .trimStart();
            const isCommand = text.length > 0 && !text.startsWith('#');
            line.properties['data-line-type'] = isCommand ? 'command' : 'comment';
          }
        }
      }

      // Build header with icon + language label
      const iconPath = `/icons/lang/${lang}.svg`;
      const headerChildren: any[] = [];

      // Shell languages get dot header, others get icon + label
      if (shellLangs.includes(lang)) {
        headerChildren.push({
          type: 'element',
          tagName: 'img',
          properties: { src: iconPath, alt: lang, className: ['shiki-lang-icon'], width: '12', height: '12' },
          children: [],
        });
        headerChildren.push({
          type: 'element',
          tagName: 'span',
          properties: { className: ['shiki-lang-dots'] },
          children: [{ type: 'text', value: '● ● ●' }],
        });
      } else {
        headerChildren.push({
          type: 'element',
          tagName: 'img',
          properties: { src: iconPath, alt: lang, className: ['shiki-lang-icon'], width: '12', height: '12' },
          children: [],
        });
        headerChildren.push({
          type: 'element',
          tagName: 'span',
          properties: {},
          children: [{ type: 'text', value: lang }],
        });
      }

      const headerNode = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['shiki-header'] },
        children: headerChildren,
      };

      // Wrap in a div with lang label
      node.tagName = 'div';
      node.properties = { className: ['shiki-wrapper'], 'data-lang': lang };
      node.children = [headerNode, preNode];

      return SKIP;
    });
  };
}

function rehypeSlug() {
  return async (tree: any) => {
    const { visit } = await import('unist-util-visit');
    const getUniqueSlug = createUniqueSlugger();
    visit(tree, 'element', (node: any) => {
      if (!['h2', 'h3', 'h4'].includes(node.tagName)) return;
      const text = node.children
        ?.map((child: any) => child.value || '')
        .join('');
      if (text) {
        node.properties = node.properties || {};
        node.properties.id = getUniqueSlug(text);
      }
    });
  };
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''));
}

export function getAllPosts(): PostMeta[] {
  const slugs = getAllSlugs();
  const posts = slugs
    .map((slug) => {
      const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
      const source = fs.readFileSync(filePath, 'utf-8');
      const { data, content } = matter(source);
      const frontmatter = data as PostFrontmatter;

      if (process.env.NODE_ENV === 'production' && frontmatter.draft) {
        return null;
      }

      return {
        ...frontmatter,
        slug,
        readingTime: computeReadingTime(content),
      };
    })
    .filter((post): post is PostMeta => post !== null);

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getAllTags(): { name: string; count: number }[] {
  const posts = getAllPosts();
  const tagMap = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    }
  }
  return Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getPostsByTag(tag: string): PostMeta[] {
  return getAllPosts().filter((post) =>
    post.tags.map((t) => t.toLowerCase()).includes(tag.toLowerCase())
  );
}

export async function getPostBySlug(slug: string): Promise<Post> {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  const source = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(source);
  const frontmatter = data as PostFrontmatter;

  const toc = extractToc(content);

  const compiled = await compile(content, {
    outputFormat: 'function-body',
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, rehypeShiki],
  });

  const { default: Content } = await run(String(compiled), {
    ...runtime,
    baseUrl: import.meta.url,
  });

  return {
    meta: {
      ...frontmatter,
      slug,
      readingTime: computeReadingTime(content),
    },
    content: Content,
    toc,
  };
}
