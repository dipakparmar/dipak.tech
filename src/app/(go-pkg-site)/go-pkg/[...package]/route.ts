import { NextRequest, NextResponse } from 'next/server';
import { buildGoImportMeta, getGitHubUrl, repoExists } from '@/lib/github';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ package: string[] }> }
) {
  const { package: pkgSegments } = await params;
  const goGet = request.nextUrl.searchParams.get('go-get');

  // First segment is the repo name, may include @version suffix
  const firstSegment = pkgSegments[0] || '';
  const repoName = firstSegment.split('@')[0];
  const pkgVersion = firstSegment.split('@')[1];

  // Full package path (repo + subpackages)
  const fullPkgPath = pkgSegments.join('/').split('@')[0];

  const exists = await repoExists(repoName);
  if (!exists) {
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>404 - Package not found</title>
</head>
<body>
<h1>404</h1>
<p>Package "${repoName}" not found</p>
<p><a href="/go-pkg">← Back to all packages</a></p>
</body>
</html>`;
    return new NextResponse(html, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  // go-import always references the repo root
  const goImportContent = buildGoImportMeta(repoName);
  const githubUrl = getGitHubUrl(repoName);

  // For browser redirect, include subpath if present
  let redirectUrl = githubUrl;
  if (pkgVersion) {
    redirectUrl = `${githubUrl}/releases/tag/${pkgVersion}`;
  } else if (pkgSegments.length > 1) {
    // Redirect to subpackage folder in repo
    const subPath = pkgSegments.slice(1).join('/');
    redirectUrl = `${githubUrl}/tree/main/${subPath}`;
  }

  // Go tools request with ?go-get=1 - return minimal HTML
  if (goGet === '1') {
    const html = `<!DOCTYPE html>
<html>
<head>
<meta name="go-import" content="${goImportContent}">
</head>
<body></body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    });
  }

  // Browser request - return HTML with go-import meta and redirect
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="go-import" content="${goImportContent}">
<meta http-equiv="refresh" content="0;URL='${redirectUrl}'">
<title>go.pkg.dipak.io/${fullPkgPath}</title>
</head>
<body>
<p>Redirecting to <a href="${redirectUrl}">${redirectUrl}</a>...</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}
