const TOOLS_HOST = "tools.dipak.io"

export function isToolsHost(host?: string | null) {
  return Boolean(host && host.includes(TOOLS_HOST))
}

export function getToolsBasePath(host?: string | null) {
  return isToolsHost(host) ? "" : "/tools"
}

export function buildToolsHref(path: string, host?: string | null) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const basePath = getToolsBasePath(host)
  return `${basePath}${normalizedPath}`
}

export function normalizeToolsPathname(pathname: string, host?: string | null) {
  if (!pathname) return "/"

  if (isToolsHost(host)) {
    if (pathname === "/tools") return "/"
    if (pathname.startsWith("/tools/")) {
      return pathname.replace(/^\/tools/, "")
    }
    return pathname
  }

  if (pathname === "/") return "/tools"
  if (pathname.startsWith("/tools")) return pathname
  return `/tools${pathname.startsWith("/") ? "" : "/"}${pathname}`
}
