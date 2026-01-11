"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReleaseNotesDisplay } from "@/components/release-notes-display"
import { ReleaseNotesForm } from "@/components/release-notes-form"
import { AlertCircle, BookOpen, Filter, Github } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

interface VersionRange {
  min: string
  max: string
}

interface Release {
  tag_name: string
  name: string
  body: string
  published_at: string
  html_url: string
  prerelease: boolean
}

function parseRepo(input: string) {
  const trimmed = input.trim().replace(/\.git$/, "")
  if (!trimmed) return null

  const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/i)
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2] }
  }

  const parts = trimmed.split("/")
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { owner: parts[0], repo: parts[1] }
  }

  return null
}

function parseRanges(input: string | null) {
  if (!input) return [{ min: "", max: "" }]
  const ranges = input
    .split(",")
    .map((entry) => entry.split("..").map((value) => value.trim()))
    .filter((pair) => pair.length === 2 && pair[0] && pair[1])
    .map(([min, max]) => ({ min, max }))

  return ranges.length > 0 ? ranges : [{ min: "", max: "" }]
}

function normalizeRanges(ranges: VersionRange[]) {
  return ranges
    .map((range) => ({ min: range.min.trim(), max: range.max.trim() }))
    .filter((range) => range.min && range.max)
}

function serializeRanges(ranges: VersionRange[]) {
  if (ranges.length === 0) return ""
  return ranges.map((range) => `${range.min}..${range.max}`).join(",")
}

export function ReleaseNotesTool() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const prevUrlKey = useRef<string | null>(null)

  const [repoInput, setRepoInput] = useState("")
  const [versionRanges, setVersionRanges] = useState<VersionRange[]>([{ min: "", max: "" }])
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<{ totalFetched?: number; skippedRanges?: string[] } | null>(null)

  const parsedRepo = useMemo(() => parseRepo(repoInput), [repoInput])
  const repoHint = parsedRepo ? `${parsedRepo.owner}/${parsedRepo.repo}` : undefined

  const updateUrlParams = useCallback(
    (repoKey: string, ranges: VersionRange[]) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("repo", repoKey)
      const rangesValue = serializeRanges(ranges)
      if (rangesValue) {
        params.set("ranges", rangesValue)
      } else {
        params.delete("ranges")
      }
      const nextUrl = `${pathname}?${params.toString()}`
      prevUrlKey.current = `${repoKey}|${rangesValue}`
      router.push(nextUrl)
    },
    [pathname, router, searchParams],
  )

  const fetchReleaseNotes = useCallback(
    async (owner: string, repo: string, ranges: VersionRange[], updateUrl: boolean) => {
      setLoading(true)
      setError(null)
      setReleases([])
      setMeta(null)

      try {
        if (updateUrl) {
          updateUrlParams(`${owner}/${repo}`, ranges)
        }

        const response = await fetch("/api/github-release-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo, versionRanges: ranges }),
        })

        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch release notes")
        }

        setReleases(result.releases || [])
        setMeta({
          totalFetched: result.totalFetched,
          skippedRanges: result.skippedRanges,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch release notes")
      } finally {
        setLoading(false)
      }
    },
    [updateUrlParams],
  )

  const handleFetch = async () => {
    const parsed = parseRepo(repoInput)
    if (!parsed) {
      setError("Enter a valid GitHub repository (owner/repo or full URL).")
      return
    }

    const normalizedRanges = normalizeRanges(versionRanges)
    if (normalizedRanges.length === 0) {
      setError("Add at least one valid version range before fetching.")
      return
    }

    setRepoInput(`${parsed.owner}/${parsed.repo}`)
    await fetchReleaseNotes(parsed.owner, parsed.repo, normalizedRanges, true)
  }

  useEffect(() => {
    const repoParam = searchParams.get("repo")
    const rangesParam = searchParams.get("ranges") || ""
    if (!repoParam) return

    const urlKey = `${repoParam}|${rangesParam}`
    if (urlKey === prevUrlKey.current) return
    prevUrlKey.current = urlKey

    const parsed = parseRepo(repoParam)
    if (!parsed) return
    const parsedRanges = parseRanges(rangesParam)
    const normalizedRanges = normalizeRanges(parsedRanges)
    setRepoInput(`${parsed.owner}/${parsed.repo}`)
    setVersionRanges(parsedRanges)

    if (normalizedRanges.length > 0) {
      fetchReleaseNotes(parsed.owner, parsed.repo, normalizedRanges, false)
    }
  }, [fetchReleaseNotes, searchParams])

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <ReleaseNotesForm
          repoInput={repoInput}
          repoHint={repoHint}
          versionRanges={versionRanges}
          loading={loading}
          onRepoInputChange={setRepoInput}
          onVersionRangesChange={setVersionRanges}
          onFetch={handleFetch}
          onExampleSelect={(value) => setRepoInput(value)}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Github className="h-4 w-4 text-muted-foreground" />
              How this works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <Filter className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Filter by version ranges</p>
                <p>Use ranges like 1.2.0..1.5.0 to keep notes focused on a release window.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Export or print</p>
                <p>Download the combined notes as Markdown or print a release summary.</p>
              </div>
            </div>
            {meta?.totalFetched && (
              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Repository stats</p>
                <p>{meta.totalFetched} releases scanned from the GitHub API.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {meta?.skippedRanges?.length ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Some ranges were skipped</AlertTitle>
          <AlertDescription>
            {meta.skippedRanges.join(", ")} could not be parsed. Check formatting and try again.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load release notes</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {releases.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{releases.length} releases</Badge>
          <span>Latest data fetched from GitHub.</span>
        </div>
      )}

      <ReleaseNotesDisplay releases={releases} loading={loading} />
    </div>
  )
}
