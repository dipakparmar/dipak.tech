"use client"

import { Calendar, Download, ExternalLink, Eye, EyeOff, Printer, Tag } from "lucide-react"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Streamdown } from "streamdown"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"

interface Release {
  tag_name: string
  name: string
  body: string
  published_at: string
  html_url: string
  prerelease: boolean
}

interface ReleaseNotesDisplayProps {
  releases: Release[]
  loading: boolean
}

export function ReleaseNotesDisplay({ releases, loading }: ReleaseNotesDisplayProps) {
  const [visibleReleases, setVisibleReleases] = useState<Set<string>>(
    () => new Set(releases.map((release) => release.tag_name)),
  )
  const [showAll, setShowAll] = useState(() => releases.length > 0)

  const versionGroups = useMemo(() => {
    return releases.reduce(
      (groups, release) => {
        const version = release.tag_name.replace(/^v/, "")
        const parts = version.split(".")
        const majorMinor = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : version

        if (!groups[majorMinor]) {
          groups[majorMinor] = []
        }
        groups[majorMinor].push(release)
        return groups
      },
      {} as Record<string, Release[]>,
    )
  }, [releases])

  const sortedGroups = useMemo(() => {
    return Object.entries(versionGroups).sort(([a], [b]) => {
      const parseVersion = (value: string) => value.split(".").map(Number)
      const [aMajor, aMinor] = parseVersion(a)
      const [bMajor, bMinor] = parseVersion(b)

      if (aMajor !== bMajor) return bMajor - aMajor
      return bMinor - aMinor
    })
  }, [versionGroups])

  const exportToMarkdown = () => {
    let markdown = "# Combined Release Notes\n\n"

    sortedGroups.forEach(([majorMinor, groupReleases]) => {
      markdown += `## Version ${majorMinor}.x Series\n\n`

      groupReleases
        .filter((release) => visibleReleases.has(release.tag_name))
        .forEach((release) => {
          markdown += `### ${release.tag_name}\n`
          if (release.name !== release.tag_name) {
            markdown += `**${release.name}**\n\n`
          }
          markdown += `*Released: ${new Date(release.published_at).toLocaleDateString()}*\n\n`
          markdown += `${release.body || "No release notes available"}\n\n`
          markdown += `[View on GitHub](${release.html_url})\n\n---\n\n`
        })
    })

    const blob = new Blob([markdown], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "release-notes.md"
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  const toggleRelease = (tagName: string) => {
    const newVisible = new Set(visibleReleases)
    if (newVisible.has(tagName)) {
      newVisible.delete(tagName)
    } else {
      newVisible.add(tagName)
    }
    setVisibleReleases(newVisible)
    setShowAll(newVisible.size === releases.length)
  }

  const toggleAll = () => {
    if (showAll) {
      setVisibleReleases(new Set())
      setShowAll(false)
    } else {
      setVisibleReleases(new Set(releases.map((release) => release.tag_name)))
      setShowAll(true)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Spinner className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Fetching and processing releases...</p>
        </CardContent>
      </Card>
    )
  }

  if (releases.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No releases found. Configure the repository and version ranges above to get started.
        </CardContent>
      </Card>
    )
  }

  const visibleCount = visibleReleases.size

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Combined Release Notes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Found {releases.length} stable releases across {Object.keys(versionGroups).length} version series
                {visibleCount < releases.length && ` (${visibleCount} visible)`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="print:hidden"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToMarkdown}
                className="print:hidden"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Markdown
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-medium">Release Selection</h4>
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {showAll ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {showAll ? "Hide All" : "Show All"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3 lg:grid-cols-4">
            {releases.map((release) => (
              <div key={release.tag_name} className="flex items-center gap-2">
                <Checkbox
                  id={release.tag_name}
                  checked={visibleReleases.has(release.tag_name)}
                  onCheckedChange={() => toggleRelease(release.tag_name)}
                />
                <label
                  htmlFor={release.tag_name}
                  className="cursor-pointer text-xs font-medium text-muted-foreground"
                >
                  {release.tag_name}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {sortedGroups.map(([majorMinor, groupReleases]) => {
        const visibleGroupReleases = groupReleases.filter((release) => visibleReleases.has(release.tag_name))

        if (visibleGroupReleases.length === 0) return null

        return (
          <Card key={majorMinor}>
            <CardHeader className="flex flex-row flex-wrap items-center gap-3">
              <Tag className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Version {majorMinor}.x Series</CardTitle>
              <Badge variant="secondary">{visibleGroupReleases.length} releases</Badge>
            </CardHeader>
            <CardContent className="space-y-8">
              {visibleGroupReleases.map((release, index) => (
                <div key={release.tag_name}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="text-base font-semibold">{release.tag_name}</h4>
                        {release.prerelease && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                            Pre-release
                          </Badge>
                        )}
                      </div>
                      {release.name !== release.tag_name && (
                        <p className="text-sm font-medium text-muted-foreground">{release.name}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(release.published_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild className="print:hidden">
                      <a href={release.html_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View on GitHub
                      </a>
                    </Button>
                  </div>

                  <div className="prose prose-sm max-w-none rounded-lg border bg-muted/20 p-4 dark:prose-invert">
                    {release.body ? (
                      <Streamdown mode="streaming" isAnimating={loading}>
                        {release.body}
                      </Streamdown>
                    ) : (
                      <p className="text-muted-foreground italic">No release notes available</p>
                    )}
                  </div>

                  {index < visibleGroupReleases.length - 1 && <Separator className="mt-8" />}
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
