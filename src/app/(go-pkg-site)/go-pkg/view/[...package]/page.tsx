import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Markdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { BlurFade } from '@/components/magicui/blur-fade';
import BlurFadeText from '@/components/magicui/blur-fade-text';
import {
  fetchRepoDetails,
  fetchReadme,
  fetchReleases,
  getGitHubUrl,
  type Release
} from '@/lib/github';
import { CopyButton } from './CopyButton';

const BLUR_FADE_DELAY = 0.04;

interface PackageViewProps {
  params: Promise<{
    package: string[];
  }>;
}

export async function generateMetadata({
  params
}: PackageViewProps): Promise<Metadata> {
  const { package: pkgSegments } = await params;
  const repoName = pkgSegments[0]?.split('@')[0] || '';

  return {
    title: `${repoName} - Go Package`,
    description: `View Go package: go.pkg.dipak.io/${repoName}`
  };
}

export const revalidate = 3600;

export default async function PackageViewPage({ params }: PackageViewProps) {
  const { package: pkgSegments } = await params;
  const repoName = pkgSegments[0]?.split('@')[0] || '';

  if (!repoName) {
    notFound();
  }

  // Fetch all data in parallel
  const [repo, readme, releases] = await Promise.all([
    fetchRepoDetails(repoName),
    fetchReadme(repoName),
    fetchReleases(repoName)
  ]);

  if (!repo) {
    notFound();
  }

  const githubUrl = getGitHubUrl(repoName);
  const installCommand = `go get go.pkg.dipak.io/${repoName}`;

  return (
    <main className="flex flex-col min-h-dvh space-y-8">
      {/* Header */}
      <section id="header">
        <div className="space-y-4">
          <BlurFade delay={BLUR_FADE_DELAY}>
            <Link
              href="/go-pkg"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to packages
            </Link>
          </BlurFade>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <BlurFadeText
                delay={BLUR_FADE_DELAY * 2}
                className="text-2xl font-bold tracking-tighter sm:text-3xl"
                yOffset={8}
                text={repo.name}
              />
              {repo.description && (
                <BlurFade delay={BLUR_FADE_DELAY * 3}>
                  <p className="text-muted-foreground">{repo.description}</p>
                </BlurFade>
              )}
            </div>

            <BlurFade delay={BLUR_FADE_DELAY * 2}>
              <div className="flex items-center gap-2 shrink-0">
                {repo.stargazers_count > 0 && (
                  <Badge variant="secondary">
                    ⭐ {repo.stargazers_count}
                  </Badge>
                )}
                {repo.forks_count > 0 && (
                  <Badge variant="secondary">
                    🔀 {repo.forks_count}
                  </Badge>
                )}
              </div>
            </BlurFade>
          </div>

          {/* Topics */}
          {repo.topics && repo.topics.length > 0 && (
            <BlurFade delay={BLUR_FADE_DELAY * 4}>
              <div className="flex flex-wrap gap-2">
                {repo.topics.map((topic) => (
                  <Badge key={topic} variant="outline" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            </BlurFade>
          )}

          {/* Install Command */}
          <BlurFade delay={BLUR_FADE_DELAY * 5}>
            <div className="flex items-center gap-2 rounded-md bg-zinc-100 dark:bg-zinc-900 p-3 border border-zinc-200 dark:border-zinc-800">
              <code className="flex-1 text-sm font-mono text-zinc-700 dark:text-zinc-300 truncate">
                <span className="text-zinc-400 dark:text-zinc-500">$</span> {installCommand}
              </code>
              <CopyButton text={installCommand} />
            </div>
          </BlurFade>

          {/* Action Links */}
          <BlurFade delay={BLUR_FADE_DELAY * 6}>
            <div className="flex items-center gap-4">
              <Link
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline flex items-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                View on GitHub
              </Link>
              {repo.license && (
                <span className="text-sm text-muted-foreground">
                  📄 {repo.license.name}
                </span>
              )}
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Versions Section */}
      {releases.length > 0 && (
        <section id="versions">
          <BlurFade delay={BLUR_FADE_DELAY * 7}>
            <h2 className="text-xl font-bold mb-4">Versions</h2>
          </BlurFade>
          <div className="space-y-3">
            {releases.slice(0, 10).map((release, index) => (
              <BlurFade
                key={release.id}
                delay={BLUR_FADE_DELAY * 8 + index * 0.03}
              >
                <ReleaseCard release={release} repoName={repoName} />
              </BlurFade>
            ))}
          </div>
          {releases.length > 10 && (
            <BlurFade delay={BLUR_FADE_DELAY * 11}>
              <Link
                href={`${githubUrl}/releases`}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-4 text-sm text-blue-500 hover:underline"
              >
                View all {releases.length} releases →
              </Link>
            </BlurFade>
          )}
        </section>
      )}

      {/* README Section */}
      {readme && (
        <section id="readme">
          <BlurFade delay={BLUR_FADE_DELAY * 9}>
            <h2 className="text-xl font-bold mb-4">README</h2>
          </BlurFade>
          <BlurFade delay={BLUR_FADE_DELAY * 10}>
            <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-zinc-800">
              <Markdown>{readme}</Markdown>
            </div>
          </BlurFade>
        </section>
      )}

      {/* No README fallback */}
      {!readme && releases.length === 0 && (
        <BlurFade delay={BLUR_FADE_DELAY * 9}>
          <p className="text-muted-foreground text-sm">
            No README or releases found for this package.
          </p>
        </BlurFade>
      )}
    </main>
  );
}

function ReleaseCard({
  release,
  repoName
}: {
  release: Release;
  repoName: string;
}) {
  const installCommand = `go get go.pkg.dipak.io/${repoName}@${release.tag_name}`;
  const date = new Date(release.published_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href={release.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono font-semibold text-blue-500 hover:underline"
          >
            {release.tag_name}
          </Link>
          {release.prerelease && (
            <Badge variant="outline" className="text-xs">
              pre-release
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>

      {release.name && release.name !== release.tag_name && (
        <p className="text-sm text-muted-foreground">{release.name}</p>
      )}

      <div className="flex items-center gap-2 rounded-md bg-zinc-100 dark:bg-zinc-900 p-2 border border-zinc-200 dark:border-zinc-800">
        <code className="flex-1 text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate">
          <span className="text-zinc-400 dark:text-zinc-500">$</span> {installCommand}
        </code>
        <CopyButton text={installCommand} />
      </div>
    </div>
  );
}
