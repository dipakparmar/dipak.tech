# dipak.tech

Personal portfolio and multi-site platform built with Next.js.

## Features

### Portfolio Site (dipak.tech)
- Personal portfolio with resume, projects, and blog
- Theme switching (light/dark mode)

### Developer Tools
- **Certificate Tools** (`/tools/certificates`) - SSL/TLS certificate utilities:
  - CT Log Search - Search Certificate Transparency logs
  - Certificate Decoder - Decode PEM certificates or fetch from URL
  - CSR Generator - Generate Certificate Signing Requests with SAN support
  - Key Generator - Generate RSA/EC key pairs
  - Validation type detection (DV/OV/EV)

- **OSINT Command Center** (`/tools/osint`) - Domain intelligence:
  - DNS record scanning (A, AAAA, CNAME, MX, TXT, NS, SOA)
  - IP geolocation lookup
  - Visual DNS map with color-coded connections

- **WHOIS Lookup** (`/tools/whois`) - Domain registration info

### Go Package Hosting (go.pkg.dipak.io)
- Vanity import URLs for Go packages

### Container Registry Proxy (cr.dipak.io)
- Docker Registry V2 API proxy for vanity domain pulls

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Bun

## Development

```bash
bun install
bun dev
```

---

### Credits

- Home Page Design inspiration from [dillionverma/portfolio](https://github.com/dillionverma/portfolio)
