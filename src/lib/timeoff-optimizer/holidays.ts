import type { HolidaysTypes } from "date-holidays"
import type { CountryInfo } from "./types"

let holidaysModulePromise: Promise<typeof import("date-holidays")> | null = null

const loadHolidaysModule = () => {
  if (!holidaysModulePromise) {
    holidaysModulePromise = import("date-holidays")
  }
  return holidaysModulePromise
}

const lang = "en"
const publicOptions: HolidaysTypes.Options = {
  languages: [lang],
  types: ["public"],
}

export const fetchPublicHolidays = async (
  year: number,
  countryInfo: CountryInfo
): Promise<Array<{ date: string; name: string }>> => {
  const mod = await loadHolidaysModule()
  const Holidays = mod.default
  const hd = new Holidays(countryInfo, publicOptions)
  const holidays = hd.getHolidays(year, lang) || []
  return holidays
    .filter((h) => h.type === "public")
    .map((h) => ({ date: h.date.slice(0, 10), name: h.name }))
}

export const listCountries = async (): Promise<
  Array<{ countryCode: string; name: string }>
> => {
  const mod = await loadHolidaysModule()
  const Holidays = mod.default
  const hd = new Holidays(publicOptions)
  const countries = hd.getCountries(lang)
  if (!countries) return []
  return Object.entries(countries).map(([countryCode, name]) => ({ countryCode, name }))
}

export const listStates = async (
  countryCode: string
): Promise<Array<{ code: string; name: string }>> => {
  const mod = await loadHolidaysModule()
  const Holidays = mod.default
  const hd = new Holidays(countryCode, publicOptions)
  const states = hd.getStates(countryCode, lang)
  if (!states) return []
  return Object.entries(states).map(([code, name]) => ({ code, name }))
}

export const listRegions = async (
  countryCode: string,
  stateCode: string
): Promise<Array<{ code: string; name: string }>> => {
  const mod = await loadHolidaysModule()
  const Holidays = mod.default
  const hd = new Holidays(countryCode, stateCode, publicOptions)
  const regions = hd.getRegions(countryCode, stateCode, lang)
  if (!regions) return []
  return Object.entries(regions).map(([code, name]) => ({ code, name }))
}
