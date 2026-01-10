import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildGoImportMeta, getGitHubUrl, repoExists } from '@/lib/github';

interface PackagePageProps {
  params: Promise<{
    package: string;
  }>;
  searchParams: Promise<{
    'go-get'?: string;
  }>;
}

export async function generateMetadata({
  params
}: PackagePageProps): Promise<Metadata> {
  const { package: pkgString } = await params;
  const pkgName = pkgString.split('@')[0];

  return {
    title: `go.pkg.dipak.io/${pkgName}`,
    description: `Go package: ${pkgName}`,
    other: {
      'go-import': buildGoImportMeta(pkgName)
    }
  };
}

export default async function PackagePage({
  params,
  searchParams
}: PackagePageProps) {
  const { package: pkgString } = await params;
  const { 'go-get': goGet } = await searchParams;
  const pkgName = pkgString.split('@')[0];
  const pkgVersion = pkgString.split('@')[1];

  const exists = await repoExists(pkgName);
  if (!exists) {
    notFound();
  }

  const goImportContent = buildGoImportMeta(pkgName);
  const githubUrl = getGitHubUrl(pkgName);
  const redirectUrl = pkgVersion
    ? `${githubUrl}/releases/tag/${pkgVersion}`
    : githubUrl;

  // Go tools request with ?go-get=1 - return minimal HTML with just the meta tag
  if (goGet === '1') {
    return (
      <html>
        <head>
          <meta name="go-import" content={goImportContent} />
        </head>
        <body />
      </html>
    );
  }

  // Browser request - show redirect page
  return (
    <>
      <head>
        <meta name="go-import" content={goImportContent} />
        <meta httpEquiv="refresh" content={`0;URL='${redirectUrl}'`} />
      </head>
      <main className="flex flex-col min-h-dvh items-center justify-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Redirecting you to the{' '}
          <Link href={redirectUrl} className="text-blue-500 hover:underline">
            project page
          </Link>
          ...
        </p>
      </main>
    </>
  );
}
