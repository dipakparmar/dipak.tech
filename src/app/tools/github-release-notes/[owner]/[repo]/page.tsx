import { headers } from "next/headers"
import { redirect } from "next/navigation"

type PageProps = {
  params: { owner: string; repo: string }
  searchParams: Record<string, string | string[] | undefined>
}

const getParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value || "")

export default async function ReleaseNotesRedirectPage({ params, searchParams }: PageProps) {
  const headersList = await headers()
  const host = headersList.get("host") || ""
  const isToolsDomain = host.includes("tools.dipak.io")

  const basePath = isToolsDomain ? "" : "/tools"
  const repoKey = `${params.owner}/${params.repo}`
  const minVersion = getParam(searchParams.minVersion)
  const maxVersion = getParam(searchParams.maxVersion)
  const fallbackRange = minVersion && maxVersion ? `${minVersion}..${maxVersion}` : ""
  const rangesParam = getParam(searchParams.ranges) || fallbackRange

  const paramsForRedirect = new URLSearchParams({ repo: repoKey })
  if (rangesParam) {
    paramsForRedirect.set("ranges", rangesParam)
  }

  redirect(`${basePath}/github-release-notes?${paramsForRedirect.toString()}`)
}
