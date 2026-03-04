"use client"

import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, ShieldCheck } from "lucide-react"
import type { AuthenticationResults, AuthResult } from "@/lib/email-header-parser"
import { CommentMarker, AnnotatedRow } from "./annotation-components"
import { getHeaderAnnotation, getCardAnnotation } from "@/lib/header-annotations"

interface AuthResultsProps {
  authentication: AuthenticationResults
}

function getResultIcon(result: string) {
  switch (result.toLowerCase()) {
    case "pass":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case "fail":
    case "hardfail":
    case "permerror":
      return <XCircle className="h-4 w-4 text-red-500" />
    case "softfail":
    case "temperror":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />
    default:
      return <MinusCircle className="h-4 w-4 text-muted-foreground" />
  }
}

function getResultBadge(result: string) {
  const lower = result.toLowerCase()
  if (lower === "pass") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-mono uppercase">
        {result}
      </Badge>
    )
  }
  if (["fail", "hardfail", "permerror"].includes(lower)) {
    return (
      <Badge variant="destructive" className="font-mono uppercase">
        {result}
      </Badge>
    )
  }
  if (["softfail", "temperror"].includes(lower)) {
    return (
      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-mono uppercase">
        {result}
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="font-mono uppercase">
      {result}
    </Badge>
  )
}

function getOverallVerdict(results: AuthResult[]): {
  variant: "default" | "destructive"
  title: string
  description: string
  className: string
} {
  if (results.length === 0) {
    return {
      variant: "default",
      title: "No Authentication Results",
      description: "No SPF, DKIM, or DMARC results were found in the headers.",
      className: "",
    }
  }

  const allPass = results.every((r) => r.result.toLowerCase() === "pass")
  const anyFail = results.some((r) =>
    ["fail", "hardfail", "permerror"].includes(r.result.toLowerCase())
  )

  if (allPass) {
    return {
      variant: "default",
      title: "All Checks Passed",
      description: "All authentication methods passed successfully.",
      className: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 [&>svg]:text-emerald-500",
    }
  }

  if (anyFail) {
    return {
      variant: "destructive",
      title: "Authentication Failed",
      description: "One or more authentication checks failed. This email may be spoofed.",
      className: "",
    }
  }

  return {
    variant: "default",
    title: "Mixed Results",
    description: "Authentication results are mixed. Review individual checks below.",
    className: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300 [&>svg]:text-amber-500",
  }
}

export function AuthResults({ authentication }: AuthResultsProps) {
  const verdict = getOverallVerdict(authentication.results)
  const authHeaderInfo = getHeaderAnnotation("authentication-results")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          Authentication Results
          <CommentMarker id="auth-results-header" info={authHeaderInfo} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall verdict */}
        <Alert variant={verdict.variant} className={verdict.className}>
          {verdict.variant === "destructive" ? (
            <XCircle className="h-4 w-4" />
          ) : authentication.results.length > 0 &&
            authentication.results.every((r) => r.result.toLowerCase() === "pass") ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle>{verdict.title}</AlertTitle>
          <AlertDescription>{verdict.description}</AlertDescription>
        </Alert>

        {/* Auth server */}
        {authentication.server && (
          <div className="text-xs text-muted-foreground">
            Evaluated by: <span className="font-mono font-medium">{authentication.server}</span>
          </div>
        )}

        {/* Individual results */}
        {authentication.results.length > 0 && (
          <Accordion type="multiple" defaultValue={authentication.results.map((_, i) => String(i))}>
            {authentication.results.map((result, i) => {
              const cardInfo = getCardAnnotation(result.method)
              return (
                <AccordionItem key={i} value={String(i)}>
                  <AnnotatedRow id={`auth-detail-${result.method}-${i}`}>
                    <div className="flex items-center gap-2">
                      <AccordionTrigger className="flex-1">
                        <div className="flex items-center gap-2">
                          {getResultIcon(result.result)}
                          <span className="font-mono font-medium uppercase">{result.method}</span>
                          {getResultBadge(result.result)}
                        </div>
                      </AccordionTrigger>
                      {cardInfo && (
                        <CommentMarker id={`auth-detail-${result.method}-${i}`} info={cardInfo} />
                      )}
                    </div>
                    <AccordionContent>
                      <div className="space-y-2">
                        {cardInfo && (
                          <p className="text-muted-foreground">
                            {cardInfo.description}
                          </p>
                        )}
                        <div className="rounded-md bg-muted/50 p-2">
                          <code className="font-mono text-xs break-all">{result.detail}</code>
                        </div>
                      </div>
                    </AccordionContent>
                  </AnnotatedRow>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  )
}
