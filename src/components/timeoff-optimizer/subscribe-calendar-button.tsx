"use client"

import * as React from "react"
import { CalendarPlus, Lock } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { HapticButton } from "@/components/haptic-wrappers"
import {
  googleSubscribeUrl,
  office365SubscribeUrl,
  outlookComSubscribeUrl,
} from "@/lib/timeoff-optimizer/calendar-links"

const STORAGE_KEY = "timeoff-optimizer:ics-access-code"

interface SubscribeCalendarButtonProps {
  /** Whether the owner has configured an access code at all; the entire feature is hidden when false. */
  enabled: boolean
  shareUrl: string
  year: number
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function SubscribeCalendarButton({ enabled, shareUrl, year }: SubscribeCalendarButtonProps) {
  const [accessCode, setAccessCode] = React.useState<string | null>(null)
  const [codeInput, setCodeInput] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [verifying, setVerifying] = React.useState(false)
  const [popoverOpen, setPopoverOpen] = React.useState(false)

  // Pinned once per mount so this exact feed URL keeps returning the same
  // events on every future poll instead of drifting as "today" advances.
  const [asOf] = React.useState(todayIso)

  React.useEffect(() => {
    setAccessCode(window.localStorage.getItem(STORAGE_KEY))
  }, [])

  const buildFeedUrl = React.useCallback(
    (code: string) => {
      const url = new URL(shareUrl)
      const params = new URLSearchParams(url.search)
      params.set("asOf", asOf)
      params.set("key", code)
      return `${url.origin}/api/timeoff-optimizer/ics?${params.toString()}`
    },
    [shareUrl, asOf]
  )

  if (!enabled) return null

  const handleUnlock = async () => {
    const candidate = codeInput.trim()
    if (!candidate) return
    setVerifying(true)
    setError(null)
    try {
      const res = await fetch(buildFeedUrl(candidate), { method: "HEAD" })
      if (res.ok) {
        window.localStorage.setItem(STORAGE_KEY, candidate)
        setAccessCode(candidate)
        setCodeInput("")
        setPopoverOpen(false)
      } else {
        setError("That access code didn't work.")
      }
    } catch {
      setError("Couldn't verify the code. Try again.")
    } finally {
      setVerifying(false)
    }
  }

  const handleReset = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    setAccessCode(null)
  }

  if (!accessCode) {
    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <HapticButton variant="outline" size="sm">
            <Lock className="size-3" />
            Subscribe
          </HapticButton>
        </PopoverTrigger>
        <PopoverContent align="end">
          <div>
            <PopoverTitle>Calendar subscriptions are invite-only</PopoverTitle>
            <PopoverDescription>
              If I shared this tool with you, just ask me for the code &mdash; happy to pass it
              along. Keeping it gated for now since each subscription hits a live API on my dime,
              so please keep your code to yourself.
            </PopoverDescription>
          </div>
          <div className="space-y-1.5">
            <Input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUnlock()
              }}
              placeholder="Access code"
              disabled={verifying}
              autoFocus
            />
            {error && <p className="text-destructive">{error}</p>}
            <HapticButton
              size="sm"
              className="w-full"
              onClick={handleUnlock}
              disabled={verifying || !codeInput.trim()}
            >
              {verifying ? "Checking…" : "Unlock"}
            </HapticButton>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  const icsFeedUrl = buildFeedUrl(accessCode)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <HapticButton variant="outline" size="sm">
          <CalendarPlus className="size-3" />
          Subscribe
        </HapticButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href={googleSubscribeUrl(icsFeedUrl)} target="_blank" rel="noopener noreferrer">
            Google Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={outlookComSubscribeUrl(icsFeedUrl, `Time off ${year}`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Outlook.com
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={office365SubscribeUrl(icsFeedUrl, `Time off ${year}`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Office 365
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleReset}>Reset access code</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
