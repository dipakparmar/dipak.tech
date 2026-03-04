"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Mail, Eye, Code, User, Users, Calendar, Paperclip } from "lucide-react"
import type { EmailSummary, EmailBody } from "@/lib/email-header-parser"

interface MessageViewerProps {
  summary: EmailSummary
  body: EmailBody | null
}

function formatEmailAddress(raw: string) {
  const match = raw.match(/^(.*?)\s*<(.+?)>$/)
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2] }
  }
  return { name: null, email: raw.trim() }
}

function formatDate(raw: string) {
  try {
    const date = new Date(raw)
    if (isNaN(date.getTime())) return raw
    return date.toLocaleString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    })
  } catch {
    return raw
  }
}

function sanitizeHtml(html: string): string {
  return html
    // Strip external images (keep data: URIs)
    .replace(/<img\s+[^>]*src\s*=\s*["']https?:\/\/[^"']*["'][^>]*\/?>/gi, "")
    // Strip link/stylesheet tags that load external resources
    .replace(/<link\s+[^>]*href\s*=\s*["']https?:\/\/[^"']*["'][^>]*\/?>/gi, "")
    // Strip @import and @font-face in style blocks
    .replace(/@import\s+url\([^)]*\)\s*;?/gi, "")
    .replace(/@font-face\s*\{[^}]*\}/gi, "")
}

function SandboxedHtml({ html }: { html: string }) {
  const cleanHtml = sanitizeHtml(html)
  const safeSrcdoc = `<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;">
<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  margin: 0;
  padding: 16px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
img { max-width: 100%; height: auto; }
a { color: #2563eb; pointer-events: none; }
pre, code { white-space: pre-wrap; word-wrap: break-word; }
table { border-collapse: collapse; max-width: 100%; }
td, th { padding: 4px 8px; }
</style>
</head>
<body>${cleanHtml}</body>
</html>`

  return (
    <iframe
      srcDoc={safeSrcdoc}
      sandbox=""
      title="Email content preview"
      className="w-full rounded-md border bg-white"
      style={{ height: "400px" }}
    />
  )
}

export function MessageViewer({ summary, body }: MessageViewerProps) {
  const [viewMode, setViewMode] = useState<"rendered" | "plain" | "source">(
    body?.html ? "rendered" : "plain"
  )

  const from = summary.from ? formatEmailAddress(summary.from) : null
  const to = summary.to ? formatEmailAddress(summary.to) : null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
            <Mail className="h-4 w-4 text-orange-500" />
          </div>
          Message Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email envelope */}
        <div className="space-y-2.5 rounded-lg border bg-muted/30 p-4">
          {/* Subject */}
          {summary.subject && (
            <h3 className="text-lg font-semibold leading-tight">
              {summary.subject}
            </h3>
          )}

          <Separator />

          <div className="grid gap-2 text-sm">
            {/* From */}
            {from && (
              <div className="flex items-start gap-2">
                <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <span className="text-muted-foreground">From: </span>
                  {from.name ? (
                    <>
                      <span className="font-medium">{from.name}</span>
                      <span className="ml-1 text-muted-foreground">
                        &lt;{from.email}&gt;
                      </span>
                    </>
                  ) : (
                    <span className="font-mono">{from.email}</span>
                  )}
                </div>
              </div>
            )}

            {/* To */}
            {to && (
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <span className="text-muted-foreground">To: </span>
                  {to.name ? (
                    <>
                      <span className="font-medium">{to.name}</span>
                      <span className="ml-1 text-muted-foreground">
                        &lt;{to.email}&gt;
                      </span>
                    </>
                  ) : (
                    <span className="font-mono">{to.email}</span>
                  )}
                </div>
              </div>
            )}

            {/* Date */}
            {summary.date && (
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Date: </span>
                  <span>{formatDate(summary.date)}</span>
                </div>
              </div>
            )}

            {/* Content-Type indicator */}
            {summary.contentType && (
              <div className="flex items-start gap-2">
                <Paperclip className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Type: </span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {summary.contentType.split(";")[0].trim()}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Body content */}
        {body?.hasBody && (
          <div className="space-y-3">
            {/* View mode toggle */}
            <div className="flex items-center gap-1.5">
              {body.html && (
                <button
                  onClick={() => setViewMode("rendered")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === "rendered"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  HTML
                </button>
              )}
              {body.plain && (
                <button
                  onClick={() => setViewMode("plain")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === "plain"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Mail className="h-3 w-3" />
                  Plain Text
                </button>
              )}
              <button
                onClick={() => setViewMode("source")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "source"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Code className="h-3 w-3" />
                Source
              </button>
            </div>

            {/* Content display */}
            {viewMode === "rendered" && body.html && (
              <>
                <p className="text-xs text-muted-foreground">
                  External images, fonts, and scripts are blocked for security.
                </p>
                <SandboxedHtml html={body.html} />
              </>
            )}

            {viewMode === "plain" && body.plain && (
              <div className="rounded-md border bg-muted/30 p-4">
                <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
                  {body.plain}
                </pre>
              </div>
            )}

            {viewMode === "source" && (
              <div className="rounded-md border bg-muted/30 p-4">
                <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-muted-foreground">
                  {body.raw}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* No body detected */}
        {!body && (
          <p className="text-center text-sm text-muted-foreground py-4">
            No message body detected. The input may contain only headers.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
