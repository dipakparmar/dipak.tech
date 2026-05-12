"use client"

import { useMemo } from "react"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ExternalLink, Network, Info } from "lucide-react"
import type { HeaderEntry } from "@/lib/email-header-parser"
import { detectProviderHeaders } from "@/lib/provider-headers"
import { getProviderLogoSrc } from "@/lib/provider-logos"

interface ProviderHeadersCardProps {
  headers: HeaderEntry[]
}

export function ProviderHeadersCard({
  headers
}: ProviderHeadersCardProps) {
  const { resolvedTheme } = useTheme()
  const matches = useMemo(() => detectProviderHeaders(headers), [headers])
  const logoTheme = resolvedTheme === "dark" ? "dark" : "light"

  if (matches.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Network className="h-4 w-4 text-primary" />
            </div>
            Provider Headers
          </CardTitle>
          <Badge variant="outline" className="font-mono">
            {matches.length} detected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            These headers can help identify the delivery platform and correlate messages with provider-side logs. They are useful context, not proof that the visible sender is legitimate.
          </AlertDescription>
        </Alert>

        <Accordion
          type="multiple"
          defaultValue={matches.map((match) => match.providerId)}
        >
          {matches.map((match) => {
            const logoSrc = getProviderLogoSrc(match.providerId, logoTheme)

            return (
              <AccordionItem key={match.providerId} value={match.providerId}>
                <AccordionTrigger>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2 text-left">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background">
                        {logoSrc ? (
                          <Image
                            src={logoSrc}
                            alt={`${match.providerName} logo`}
                            width={40}
                            height={40}
                            className="h-full w-full object-contain p-1.5"
                            unoptimized
                          />
                        ) : (
                          <Network className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">{match.providerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {match.summary}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-mono shrink-0">
                      {match.matchedHeaders.length} header{match.matchedHeaders.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {match.note}
                  </p>

                  <div className="space-y-3">
                    {match.matchedHeaders.map((header, index) => (
                      <div
                        key={`${match.providerId}-${header.name}-${index}`}
                        className="rounded-lg border bg-muted/20 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {header.name}
                          </Badge>
                          <span className="text-sm font-medium">
                            {header.guide.title}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {header.guide.description}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {header.guide.howToRead}
                        </p>
                        {header.guide.references &&
                          header.guide.references.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {header.guide.references.map((reference) => (
                                <a
                                  key={`${reference.label}-${reference.url}`}
                                  href={reference.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                                >
                                  {reference.label}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ))}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </CardContent>
    </Card>
  )
}
