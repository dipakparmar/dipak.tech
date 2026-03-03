"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Mail, MessageSquare, User, Calendar, AtSign, Send, FileType } from "lucide-react"
import type { EmailSummary, AuthenticationResults } from "@/lib/email-header-parser"

interface SummaryCardProps {
  summary: EmailSummary
  authentication: AuthenticationResults
  totalDeliveryTime: number | null
  formatDelay: (ms: number) => string
}

function getAuthBadge(method: string, results: AuthenticationResults["results"]) {
  const result = results.find((r) => r.method.toLowerCase() === method.toLowerCase())
  if (!result) {
    return (
      <Badge variant="secondary" className="font-mono uppercase">
        {method}: none
      </Badge>
    )
  }

  const isPassed = result.result.toLowerCase() === "pass"
  const isFailed = ["fail", "hardfail", "permerror"].includes(result.result.toLowerCase())

  if (isPassed) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono uppercase">
        {method}: {result.result}
      </Badge>
    )
  }

  if (isFailed) {
    return (
      <Badge variant="destructive" className="font-mono uppercase">
        {method}: {result.result}
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="font-mono uppercase">
      {method}: {result.result}
    </Badge>
  )
}

export function SummaryCard({ summary, authentication, totalDeliveryTime, formatDelay }: SummaryCardProps) {
  const fields = [
    { label: "From", value: summary.from, icon: User },
    { label: "To", value: summary.to, icon: Send },
    { label: "Subject", value: summary.subject, icon: MessageSquare },
    { label: "Date", value: summary.date, icon: Calendar },
  ]

  const extraFields = [
    { label: "Message-ID", value: summary.messageId, icon: AtSign },
    { label: "X-Mailer", value: summary.mailer, icon: Mail },
    { label: "Reply-To", value: summary.replyTo, icon: Send },
    { label: "Content-Type", value: summary.contentType, icon: FileType },
  ].filter((f) => f.value)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            Message Summary
          </CardTitle>
          {totalDeliveryTime !== null && (
            <Badge variant="outline" className="gap-1.5 font-mono">
              <Clock className="h-3 w-3" />
              {formatDelay(totalDeliveryTime)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary fields */}
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label} className="space-y-1">
              <div className="flex items-center gap-1.5 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
                <field.icon className="h-3 w-3" />
                {field.label}
              </div>
              <p className="font-mono text-xs break-all">{field.value || "N/A"}</p>
            </div>
          ))}
        </div>

        {/* Extra fields */}
        {extraFields.length > 0 && (
          <>
            <div className="h-px bg-border" />
            <div className="grid gap-3 sm:grid-cols-2">
              {extraFields.map((field) => (
                <div key={field.label} className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
                    <field.icon className="h-3 w-3" />
                    {field.label}
                  </div>
                  <p className="font-mono text-xs break-all">{field.value}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Authentication badges */}
        {authentication.results.length > 0 && (
          <>
            <div className="h-px bg-border" />
            <div className="space-y-2">
              <div className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground">
                Authentication
              </div>
              <div className="flex flex-wrap gap-2">
                {getAuthBadge("spf", authentication.results)}
                {getAuthBadge("dkim", authentication.results)}
                {getAuthBadge("dmarc", authentication.results)}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
