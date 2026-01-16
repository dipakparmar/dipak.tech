import { Suspense } from "react"
import IPInfoContent from "./ip-info-content"
import { Loader2 } from "lucide-react"

export default function IPInfoPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-100 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <IPInfoContent />
    </Suspense>
  )
}
