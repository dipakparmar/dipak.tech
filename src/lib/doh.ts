/**
 * A DoH answer set is not guaranteed to hold the type you asked for. When a
 * name is a CNAME, the resolver returns the CNAME record for *every* query
 * type — so `www.example.com` behind `sites.framer.app.` answers the MX, NS and
 * TXT queries with that CNAME. Consuming `Answer[].data` unfiltered reports the
 * CNAME target as an MX record, an NS record, and an IP address.
 */
export const DNS_TYPE_CODES = {
  A: 1,
  NS: 2,
  CNAME: 5,
  SOA: 6,
  MX: 15,
  TXT: 16,
  AAAA: 28,
  DS: 43
} as const;

export type DnsTypeName = keyof typeof DNS_TYPE_CODES;

export function answersOfType(
  answers: Array<{ type: number; data: string }> | undefined,
  type: DnsTypeName
): string[] {
  const code = DNS_TYPE_CODES[type];
  return (answers ?? []).filter((a) => a.type === code).map((a) => a.data);
}
