import { NextRequest, NextResponse } from "next/server"
import * as tls from "tls"

interface CertificateInfo {
  pem: string
  subject: Record<string, string>
  issuer: Record<string, string>
  validFrom: string
  validTo: string
  serialNumber: string
  fingerprint: string
  fingerprint256: string
  subjectAltNames: string[]
  validationType: "DV" | "OV" | "EV"
}

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

function parseDN(dn: string): Record<string, string> {
  const result: Record<string, string> = {}
  const parts = dn.split(/(?<!\\),\s*/)
  for (const part of parts) {
    const [key, ...valueParts] = part.split("=")
    if (key && valueParts.length > 0) {
      result[key.trim()] = valueParts.join("=").trim()
    }
  }
  return result
}

// Extract policy OIDs from raw certificate DER
function extractPolicyOIDs(der: Buffer): string[] {
  const policyOIDs: string[] = []

  const readLength = (data: Buffer, offset: number): { length: number; bytesRead: number } => {
    const first = data[offset]
    if (first < 0x80) return { length: first, bytesRead: 1 }
    const numBytes = first & 0x7f
    let length = 0
    for (let i = 0; i < numBytes; i++) {
      length = (length << 8) | data[offset + 1 + i]
    }
    return { length, bytesRead: 1 + numBytes }
  }

  const readOID = (data: Buffer, offset: number, length: number): string => {
    const bytes = data.slice(offset, offset + length)
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
  const certPoliciesOID = Buffer.from([0x55, 0x1d, 0x20])

  for (let i = 0; i < der.length - 10; i++) {
    if (der[i] === 0x06 && der[i + 1] === 0x03 &&
        der[i + 2] === 0x55 && der[i + 3] === 0x1d && der[i + 4] === 0x20) {
      // Found certificate policies extension
      let offset = i + 5

      // Skip critical flag if present
      if (der[offset] === 0x01) {
        offset += 3
      }

      // OCTET STRING wrapper
      if (der[offset] === 0x04) {
        offset++
        const octetLen = readLength(der, offset)
        offset += octetLen.bytesRead

        // certificatePolicies SEQUENCE
        if (der[offset] === 0x30) {
          offset++
          const seqLen = readLength(der, offset)
          offset += seqLen.bytesRead
          const seqEnd = offset + seqLen.length

          while (offset < seqEnd && offset < der.length - 5) {
            if (der[offset] !== 0x30) break

            offset++ // SEQUENCE tag
            const policyLen = readLength(der, offset)
            offset += policyLen.bytesRead
            const policyEnd = offset + policyLen.length

            // Policy OID
            if (der[offset] === 0x06) {
              offset++
              const oidLen = readLength(der, offset)
              offset += oidLen.bytesRead
              const oid = readOID(der, offset, oidLen.length)
              policyOIDs.push(oid)
            }

            offset = policyEnd
          }
        }
      }
      break
    }
  }

  return policyOIDs
}

// Determine validation type from certificate data
function determineValidationType(
  subject: Record<string, string>,
  policyOIDs: string[]
): "DV" | "OV" | "EV" {
  const hasEVPolicy = policyOIDs.some((oid) => EV_POLICY_OIDS.has(oid))
  const hasOrganization = !!(subject.O || subject.organizationName)

  if (hasEVPolicy) return "EV"
  if (hasOrganization) return "OV"
  return "DV"
}

async function fetchCertificate(hostname: string, port: number = 443): Promise<CertificateInfo> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: hostname,
        port,
        servername: hostname,
        rejectUnauthorized: false, // Allow self-signed certs
        timeout: 10000,
      },
      () => {
        const cert = socket.getPeerCertificate(true)

        if (!cert || Object.keys(cert).length === 0) {
          socket.destroy()
          reject(new Error("No certificate received from server"))
          return
        }

        // Convert raw DER to PEM
        let pem = ""
        if (cert.raw) {
          const base64 = cert.raw.toString("base64")
          const lines = base64.match(/.{1,64}/g) || []
          pem = `-----BEGIN CERTIFICATE-----\n${lines.join("\n")}\n-----END CERTIFICATE-----`
        }

        // Parse subject alt names
        const subjectAltNames: string[] = []
        if (cert.subjectaltname) {
          const parts = cert.subjectaltname.split(", ")
          for (const part of parts) {
            const [type, value] = part.split(":")
            if (type === "DNS" && value) {
              subjectAltNames.push(value)
            } else if (type === "IP Address" && value) {
              subjectAltNames.push(value)
            }
          }
        }

        // Extract policy OIDs and determine validation type
        const policyOIDs = cert.raw ? extractPolicyOIDs(cert.raw) : []
        const subject: Record<string, string> = typeof cert.subject === "object"
          ? Object.fromEntries(Object.entries(cert.subject).map(([k, v]) => [k, String(v)]))
          : parseDN(String(cert.subject || ""))
        const issuer: Record<string, string> = typeof cert.issuer === "object"
          ? Object.fromEntries(Object.entries(cert.issuer).map(([k, v]) => [k, String(v)]))
          : parseDN(String(cert.issuer || ""))
        const validationType = determineValidationType(subject, policyOIDs)

        const info: CertificateInfo = {
          pem,
          subject,
          issuer,
          validFrom: cert.valid_from || "",
          validTo: cert.valid_to || "",
          serialNumber: cert.serialNumber || "",
          fingerprint: cert.fingerprint || "",
          fingerprint256: cert.fingerprint256 || "",
          subjectAltNames,
          validationType,
        }

        socket.destroy()
        resolve(info)
      }
    )

    socket.on("error", (err) => {
      socket.destroy()
      reject(err)
    })

    socket.on("timeout", () => {
      socket.destroy()
      reject(new Error("Connection timed out"))
    })
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const host = searchParams.get("host")
  const portStr = searchParams.get("port")

  if (!host) {
    return NextResponse.json({ error: "Missing 'host' parameter" }, { status: 400 })
  }

  // Validate hostname (basic check)
  const hostnamePattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  if (!hostnamePattern.test(host)) {
    return NextResponse.json({ error: "Invalid hostname format" }, { status: 400 })
  }

  const port = portStr ? parseInt(portStr, 10) : 443
  if (isNaN(port) || port < 1 || port > 65535) {
    return NextResponse.json({ error: "Invalid port number" }, { status: 400 })
  }

  try {
    const certInfo = await fetchCertificate(host, port)
    return NextResponse.json(certInfo)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch certificate"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
