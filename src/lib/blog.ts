import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { compile, run } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
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

function computeReadingTime(content: string): number {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

function extractToc(content: string): TocEntry[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const entries: TocEntry[] = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    entries.push({
      id: slugify(match[2]),
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
    const { visit } = await import('unist-util-visit');

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

      const html = highlighter.codeToHtml(code, {
        lang,
        themes: { light: 'github-light', dark: 'github-dark' },
      });

      node.tagName = 'div';
      node.properties = { className: ['shiki-wrapper'], 'data-lang': lang };
      node.children = [{ type: 'raw', value: html }];
    });
  };
}

function rehypeSlug() {
  return async (tree: any) => {
    const { visit } = await import('unist-util-visit');
    visit(tree, 'element', (node: any) => {
      if (!['h2', 'h3', 'h4'].includes(node.tagName)) return;
      const text = node.children
        ?.map((child: any) => child.value || '')
        .join('');
      if (text) {
        node.properties = node.properties || {};
        node.properties.id = slugify(text);
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
