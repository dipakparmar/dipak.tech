import { NextResponse, type NextRequest } from "next/server";

// ponytail: access logging only — Next production has no built-in request logs.
// Structured JSON so kubectl logs stays greppable. Add levels/redaction only if this falls short.
export function proxy(request: NextRequest) {
  console.log(
    JSON.stringify({
      level: "info",
      method: request.method,
      host: request.headers.get("host"),
      path: request.nextUrl.pathname,
      t: new Date().toISOString(),
    }),
  );
  return NextResponse.next();
}

// Skip static assets and image optimizer so the log is requests, not noise.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
