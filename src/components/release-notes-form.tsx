"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface VersionRange {
  min: string
  max: string
}

interface ReleaseNotesFormProps {
  repoInput: string
  repoHint?: string
  versionRanges: VersionRange[]
  loading: boolean
  onRepoInputChange: (value: string) => void
  onVersionRangesChange: (ranges: VersionRange[]) => void
  onFetch: () => void
  onExampleSelect?: (value: string) => void
}

export function ReleaseNotesForm({
  repoInput,
  repoHint,
  versionRanges,
  loading,
  onRepoInputChange,
  onVersionRangesChange,
  onFetch,
  onExampleSelect,
}: ReleaseNotesFormProps) {
  const addVersionRange = () => {
    onVersionRangesChange([...versionRanges, { min: "", max: "" }])
  }

  const removeVersionRange = (index: number) => {
    if (versionRanges.length > 1) {
      onVersionRangesChange(versionRanges.filter((_, i) => i !== index))
    }
  }

  const updateVersionRange = (index: number, field: "min" | "max", value: string) => {
    const updated = versionRanges.map((range, i) => (i === index ? { ...range, [field]: value } : range))
    onVersionRangesChange(updated)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Repository Configuration</CardTitle>
        <CardDescription>
          Enter a GitHub repository and define version ranges to combine release notes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="repo-input">GitHub Repository</Label>
          <Input
            id="repo-input"
            placeholder="vercel/next.js or https://github.com/vercel/next.js"
            value={repoInput}
            onChange={(e) => onRepoInputChange(e.target.value)}
            disabled={loading}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Examples:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onExampleSelect?.("vercel/next.js")}
              disabled={loading}
            >
              vercel/next.js
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onExampleSelect?.("microsoft/vscode")}
              disabled={loading}
            >
              microsoft/vscode
            </Button>
          </div>
          {repoHint && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Parsed repository:</span>
              <Badge variant="secondary">{repoHint}</Badge>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Version Ranges</Label>
            <Button type="button" variant="outline" size="sm" onClick={addVersionRange} disabled={loading}>
              <Plus className="h-4 w-4 mr-2" />
              Add Range
            </Button>
          </div>

          {versionRanges.map((range, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder="Min version (e.g., 2.9.1)"
                value={range.min}
                onChange={(e) => updateVersionRange(index, "min", e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                placeholder="Max version (e.g., 2.9.10)"
                value={range.max}
                onChange={(e) => updateVersionRange(index, "max", e.target.value)}
                disabled={loading}
                className="flex-1"
              />
              {versionRanges.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeVersionRange(index)}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Use semantic version ranges (for example, 1.4.0 to 1.6.0). Pre-release tags are skipped.
          </p>
        </div>

        <Button onClick={onFetch} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fetching Releases...
            </>
          ) : (
            "Fetch Release Notes"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
