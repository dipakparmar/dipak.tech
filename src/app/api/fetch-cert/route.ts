import { NextRequest, NextResponse } from "next/server"
import * as tls from "tls"
import * as net from "net"

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
}

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

        const info: CertificateInfo = {
          pem,
          subject: typeof cert.subject === "object" ? cert.subject : parseDN(String(cert.subject || "")),
          issuer: typeof cert.issuer === "object" ? cert.issuer : parseDN(String(cert.issuer || "")),
          validFrom: cert.valid_from || "",
          validTo: cert.valid_to || "",
          serialNumber: cert.serialNumber || "",
          fingerprint: cert.fingerprint || "",
          fingerprint256: cert.fingerprint256 || "",
          subjectAltNames,
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
