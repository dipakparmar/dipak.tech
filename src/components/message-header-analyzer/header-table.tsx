"use client"

import { useState, useMemo, useCallback } from "react"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, TableIcon } from "lucide-react"
import type { HeaderEntry } from "@/lib/email-header-parser"
import { CommentMarker } from "./annotation-components"
import { useAnnotation } from "./annotation-provider"
import { getHeaderAnnotation } from "@/lib/header-annotations"

interface HeaderTableProps {
  headers: HeaderEntry[]
}

function AnnotatedHeaderRow({
  header,
  idx,
}: {
  header: HeaderEntry
  idx: number
}) {
  const annotationId = `header-${idx}-${header.name.toLowerCase()}`
  const info = getHeaderAnnotation(header.name)
  const { openAnnotations, registerRow, cardSides } = useAnnotation()
  const isOpen = openAnnotations.has(annotationId)
  const side = cardSides.get(annotationId) ?? "left"

  const refCallback = useCallback(
    (el: HTMLTableRowElement | null) => {
      registerRow(annotationId, isOpen ? el : null)
    },
    [annotationId, isOpen, registerRow]
  )

  return (
    <TableRow
      ref={refCallback}
      className={
        isOpen
          ? `bg-amber-50 dark:bg-amber-950/20 relative ${
              side === "left"
                ? "border-l-[3px] border-l-amber-500"
                : "border-r-[3px] border-r-amber-500"
            }`
          : ""
      }
    >
      <TableCell className="font-mono text-muted-foreground">
        {idx + 1}
      </TableCell>
      <TableCell className="font-mono font-medium">
        <span className="inline-flex items-center gap-1.5">
          <span>{header.name}</span>
          <CommentMarker id={annotationId} info={info} />
        </span>
      </TableCell>
      <TableCell className="font-mono break-all whitespace-normal max-w-[400px]">
        {header.value}
      </TableCell>
    </TableRow>
  )
}

export function HeaderTable({ headers }: HeaderTableProps) {
  const [filter, setFilter] = useState("")

  const filtered = useMemo(() => {
    if (!filter.trim()) return headers
    const lower = filter.toLowerCase()
    return headers.filter(
      (h) =>
        h.name.toLowerCase().includes(lower) ||
        h.value.toLowerCase().includes(lower)
    )
  }, [headers, filter])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <TableIcon className="h-4 w-4 text-primary" />
            </div>
            All Headers
          </CardTitle>
          <span className="text-xs text-muted-foreground shrink-0">
            {filter
              ? `${filtered.length} of ${headers.length}`
              : `${headers.length} headers`}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by name or value..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-8 font-mono"
          />
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead className="w-[180px]">Name</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground py-8"
                  >
                    {filter
                      ? "No headers match your filter."
                      : "No headers found."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((header, idx) => (
                  <AnnotatedHeaderRow
                    key={idx}
                    header={header}
                    idx={idx}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
