"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"

const DesignStudio = dynamic(() => import("./design-studio").then((m) => m.DesignStudio), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh flex-col gap-2 p-3">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="min-h-0 flex-1 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  ),
})

export function StudioTool({ backHref }: { backHref?: string }) {
  return <DesignStudio backHref={backHref} />
}
