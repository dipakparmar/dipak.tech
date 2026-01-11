// Known EV (Extended Validation) policy OIDs
const EV_POLICY_OIDS = new Set([
  "2.23.140.1.1", // CA/Browser Forum EV
  "2.16.840.1.114412.2.1", // DigiCert EV
  "2.16.840.1.114412.1.3.0.2", // DigiCert EV
  "1.3.6.1.4.1.34697.2.1", // AffirmTrust EV
  "1.3.6.1.4.1.34697.2.2", // AffirmTrust EV
  "1.3.6.1.4.1.34697.2.3", // AffirmTrust EV
  "1.3.6.1.4.1.34697.2.4", // AffirmTrust EV
  "2.16.840.1.114028.10.1.2", // Entrust EV
  "1.3.6.1.4.1.6449.1.2.1.5.1", // Sectigo/Comodo EV
  "2.16.840.1.114414.1.7.23.3", // Starfield EV
  "2.16.840.1.114413.1.7.23.3", // GoDaddy EV
  "1.3.6.1.4.1.8024.0.2.100.1.2", // QuoVadis EV
  "2.16.756.1.89.1.2.1.1", // SwissSign EV
  "1.3.6.1.4.1.14370.1.6", // GeoTrust EV
  "2.16.840.1.113733.1.7.48.1", // VeriSign/Symantec EV
  "2.16.840.1.114404.1.1.2.4.1", // Trustwave EV
  "1.3.6.1.4.1.4146.1.1", // GlobalSign EV
  "2.16.578.1.26.1.3.3", // Buypass EV
  "1.3.6.1.4.1.17326.10.14.2.1.2", // Camerfirma EV
  "1.3.6.1.4.1.17326.10.8.12.1.2", // Camerfirma EV
  "1.3.6.1.4.1.22234.2.5.2.3.1", // Keynectis EV
  "1.3.6.1.4.1.782.1.2.1.8.1", // Network Solutions EV
  "1.3.6.1.4.1.6334.1.100.1", // Cybertrust EV
  "2.16.840.1.114171.500.9", // Wells Fargo EV
  "1.3.6.1.4.1.13177.10.1.3.10", // Finmeccanica EV
  "2.16.792.3.0.4.1.1.4", // E-Tugra EV
  "1.3.6.1.4.1.40869.1.1.22.3", // TWCA EV
  "1.3.6.1.4.1.23223.1.1.1", // StartCom EV
  "2.16.840.1.114414.1.7.24.3", // Starfield EV
  "2.16.840.1.114413.1.7.24.3", // GoDaddy EV
])

/**
 * Extract policy OIDs from a PEM-encoded certificate
 */
export function extractPolicyOIDsFromPem(pem: string): string[] {
  const policyOIDs: string[] = []

  try {
    // Remove headers and decode base64
    const pemContents = pem
      .replace(/-----BEGIN CERTIFICATE-----/g, "")
      .replace(/-----END CERTIFICATE-----/g, "")
      .replace(/\s/g, "")

    const der = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

    const readLength = (offset: number): { length: number; bytesRead: number } => {
      const first = der[offset]
      if (first < 0x80) return { length: first, bytesRead: 1 }
      const numBytes = first & 0x7f
      let length = 0
      for (let i = 0; i < numBytes; i++) {
        length = (length << 8) | der[offset + 1 + i]
      }
      return { length, bytesRead: 1 + numBytes }
    }

    const readOID = (offset: number, length: number): string => {
      const bytes = der.slice(offset, offset + length)
      const parts: number[] = []
      parts.push(Math.floor(bytes[0] / 40))
      parts.push(bytes[0] % 40)
      let value = 0
      for (let i = 1; i < bytes.length; i++) {
        value = (value << 7) | (bytes[i] & 0x7f)
        if ((bytes[i] & 0x80) === 0) {
          parts.push(value)
          value = 0
        }
      }
      return parts.join(".")
    }

    // Search for Certificate Policies extension (OID 2.5.29.32 = 55 1d 20)
    for (let i = 0; i < der.length - 10; i++) {
      if (
        der[i] === 0x06 &&
        der[i + 1] === 0x03 &&
        der[i + 2] === 0x55 &&
        der[i + 3] === 0x1d &&
        der[i + 4] === 0x20
      ) {
        // Found certificate policies extension
        let offset = i + 5

        // Skip critical flag if present
        if (der[offset] === 0x01) {
          offset += 3
        }

        // OCTET STRING wrapper
        if (der[offset] === 0x04) {
          offset++
          const octetLen = readLength(offset)
          offset += octetLen.bytesRead

          // certificatePolicies SEQUENCE
          if (der[offset] === 0x30) {
            offset++
            const seqLen = readLength(offset)
            offset += seqLen.bytesRead
            const seqEnd = offset + seqLen.length

            while (offset < seqEnd && offset < der.length - 5) {
              if (der[offset] !== 0x30) break

              offset++ // SEQUENCE tag
              const policyLen = readLength(offset)
              offset += policyLen.bytesRead
              const policyEnd = offset + policyLen.length

              // Policy OID
              if (der[offset] === 0x06) {
                offset++
                const oidLen = readLength(offset)
                offset += oidLen.bytesRead
                const oid = readOID(offset, oidLen.length)
                policyOIDs.push(oid)
              }

              offset = policyEnd
            }
          }
        }
        break
      }
    }
  } catch {
    // Ignore parsing errors, return empty array
  }

  return policyOIDs
}

/**
 * Determine certificate validation type (DV, OV, or EV) from PEM and subject
 */
export function detectValidationType(
  pem: string,
  subject: Record<string, string>
): "DV" | "OV" | "EV" {
  const policyOIDs = extractPolicyOIDsFromPem(pem)
  const hasEVPolicy = policyOIDs.some((oid) => EV_POLICY_OIDS.has(oid))
  const hasOrganization = !!(subject.O || subject.organizationName)

  if (hasEVPolicy) return "EV"
  if (hasOrganization) return "OV"
  return "DV"
}
