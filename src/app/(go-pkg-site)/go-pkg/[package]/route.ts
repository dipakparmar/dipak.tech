import { NextRequest, NextResponse } from 'next/server';
import { buildGoImportMeta, getGitHubUrl, repoExists } from '@/lib/github';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ package: string }> }
) {
  const { package: pkgString } = await params;
  const goGet = request.nextUrl.searchParams.get('go-get');

  const pkgName = pkgString.split('@')[0];
  const pkgVersion = pkgString.split('@')[1];

  const exists = await repoExists(pkgName);
  if (!exists) {
    return new NextResponse('Package not found', { status: 404 });
  }

  const goImportContent = buildGoImportMeta(pkgName);
  const githubUrl = getGitHubUrl(pkgName);
  const redirectUrl = pkgVersion
    ? `${githubUrl}/releases/tag/${pkgVersion}`
    : githubUrl;

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
<title>go.pkg.dipak.io/${pkgName}</title>
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
