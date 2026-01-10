import { Metadata } from 'next';
import Link from 'next/link';
import { buildGoImportMeta, getGitHubUrl } from '@/lib/github';

interface PackagePageProps {
  params: Promise<{
    package: string;
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

export default async function PackagePage({ params }: PackagePageProps) {
  const { package: pkgString } = await params;
  const pkgName = pkgString.split('@')[0];
  const pkgVersion = pkgString.split('@')[1];

  const goImportContent = buildGoImportMeta(pkgName);
  const githubUrl = getGitHubUrl(pkgName);
  const redirectUrl = pkgVersion
    ? `${githubUrl}/releases/tag/${pkgVersion}`
    : githubUrl;

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
