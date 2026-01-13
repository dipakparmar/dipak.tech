This file provides guidance to AI Tools when working with code in this repository.

## Project Overview

Personal portfolio website (dipak.tech) built with Next.js 16, serving multiple sites through host-based routing:
- **dipak.tech** → Portfolio site (`/home`, `/resume`)
- **tools.dipak.io** → Developer tools (`/tools`)
- **go.pkg.dipak.io** → Go package vanity imports (`/go-pkg`)
- **cr.dipak.io** → Container registry proxy (`/container-registry`)
- **dipak.bio** → Links page (`/links`)

## Commands

```bash
# Development
bun dev          # Start dev server

# Build & Production
bun build        # Build for production
bun start        # Start production server

# Code Quality
bun lint         # Run ESLint
bun format       # Format with Prettier

# Other
bun analyze      # Bundle analysis
bun upgrade      # Upgrade Next.js
```

## Architecture

### Route Groups (App Router)

The app uses Next.js route groups to separate concerns:
- `src/app/(portfolio-site)/` - Main portfolio pages with navbar
- `src/app/(go-pkg-site)/` - Go package hosting with vanity imports
- `src/app/(container-registry-site)/` - Container registry proxy for Docker images
- `src/app/(links-site)/` - Social links page

Each route group has its own layout with ThemeProvider and ModeToggle for theme switching.

### Host-Based Routing

`next.config.mjs` defines rewrites that route requests based on hostname:
- `tools.dipak.io/*` → `/tools/*` (developer tools)
- `go.pkg.dipak.io/:package` → `/go-pkg/:package`
- `cr.dipak.io/v2/*` → `/container-registry/v2/*` (Docker Registry V2 API)
- `cr.dipak.io` → `/container-registry` (landing page)
- `dipak.bio` → `/links`
- Default `/` → `/home`

### Key Directories

- `src/components/ui/` - shadcn/ui components (new-york style)
- `src/components/magicui/` - Animation components (blur-fade, dock)
- `src/components/cert-tools/` - Certificate tool components (decoder, CSR generator, etc.)
- `src/lib/github.ts` - GitHub API client with retry logic and stale-while-revalidate caching
- `src/lib/container-registry.ts` - Container registry proxy logic (Docker Hub & GHCR APIs)
- `src/lib/certificate-utils.ts` - Certificate parsing utilities (validation type detection)
- `src/lib/dns-scanner.ts` - DNS record resolution for OSINT
- `src/data/data.tsx` - Static personal data (name, skills, social links)

### Component System

Uses shadcn/ui with:
- Tailwind CSS v4 with CSS variables for theming
- Radix UI primitives
- `@/` path alias maps to `./src/`

### Go Package Hosting

The `/go-pkg` routes serve `go-import` meta tags for vanity imports. The catch-all route `[...package]/route.ts` handles `?go-get=1` requests from `go get`, while view pages render package details fetched from GitHub API.

### Container Registry Proxy

The `/container-registry` routes implement a Docker Registry V2 API proxy for vanity domain pulls:
- `docker pull cr.dipak.io/ghcr/image:tag` → GHCR (ghcr.io/dipakparmar/image)
- `docker pull cr.dipak.io/docker/image:tag` → Docker Hub (docker.io/dipakparmar/image)
- `docker pull cr.dipak.io/image:tag` → Docker Hub (default)

Key endpoints:
- `/v2/` - Version check (returns `Docker-Distribution-API-Version: registry/2.0`)
- `/v2/.../manifests/<ref>` - Proxies manifests from upstream registry
- `/v2/.../blobs/<digest>` - Returns 307 redirect to upstream blob URL
- `/v2/.../tags/list` - Lists available tags

The landing page fetches and displays container images from both Docker Hub and GHCR APIs with server-side caching.

### Developer Tools

The `/tools` routes provide various developer utilities:

#### Certificate Tools (`/tools/certificates`)
- **CT Log Search** - Searches Certificate Transparency logs via CertKit API
- **Certificate Decoder** - Decodes PEM certificates client-side using custom ASN.1 parser, or fetches SSL certs from URLs via `/api/fetch-cert`
- **CSR Generator** - Generates X.509 CSRs using pkijs library with SAN support (DNS, email, IP)
- **Key Generator** - Generates RSA/EC key pairs using Web Crypto API

Key components:
- `src/components/cert-tools/certificate-details.tsx` - Shared certificate display component
- `src/components/cert-tools/cert-decoder.tsx` - PEM decoder with URL fetching
- `src/components/cert-tools/csr-generator.tsx` - CSR generation with existing key support
- `src/lib/certificate-utils.ts` - Shared utilities for validation type detection (DV/OV/EV)
- `src/app/api/fetch-cert/route.ts` - Server-side SSL certificate fetching using Node.js TLS

Certificate validation types are detected by:
1. EV: Presence of known EV policy OIDs in Certificate Policies extension
2. OV: Subject contains Organization (O) field
3. DV: Neither of the above

#### OSINT Command Center (`/tools/osint`)
- DNS record scanning with visual map
- IP geolocation lookup
- Color-coded DNS connections for easy tracing

Key files:
- `src/components/osint-results.tsx` - Results display with DNS map visualization
- `src/app/api/osint/route.ts` - DNS scanning API
- `src/app/api/resolve-ips/route.ts` - IP geolocation API
- `src/lib/dns-scanner.ts` - DNS record resolution logic

#### WHOIS Lookup (`/tools/whois`)
- Domain registration information lookup
- `src/components/whois-lookup.tsx` - WHOIS lookup component
- `src/app/api/whois/route.ts` - WHOIS API endpoint

## Environment Variables

Authorative source of truth for env vars is `.env.example`. Always refer to it when adding new variables.

Key variables:
- `GITHUB_TOKEN` - Optional, enables GHCR package listing (needs `read:packages` scope)

## Tech Stack

- Next.js 16 with App Router
- React 19
- TypeScript (strict mode)
- Tailwind CSS v4
- Bun as package manager (Node.js 24 required)
- Apollo Client for GraphQL
- motion library for animations
- pkijs for X.509 certificate/CSR generation

Authorative source of truth for dependencies is `package.json`. Always refer to it when adding or updating dependencies.

## Security Headers & CSP

Security headers are configured in `next.config.mjs` via the `headers()` function.

### Content Security Policy (CSP)

The CSP uses `'unsafe-inline'` for `script-src` due to Next.js limitations:

**Why `'unsafe-inline'` is required:**
- Next.js injects many inline scripts for hydration, routing, and React runtime
- These scripts have dynamic hashes that change per page/build
- Hash-based CSP is not practical as you cannot pre-compute all hashes
- Nonce-based CSP requires dynamic rendering (loses static page generation)

**Trade-off decision:** Static pages are prioritized over strict CSP. The site uses static generation for performance and CDN caching.

**Alternative approaches considered:**
1. **Nonce-based CSP** (`proxy.ts` + `'strict-dynamic'`): Works but forces all pages to be server-rendered
2. **Hash-based CSP**: Not feasible due to Next.js's many dynamic inline scripts
3. **Current approach**: `'unsafe-inline'` to preserve static pages

**If stricter CSP is needed in the future:**
- Use `proxy.ts` (Next.js 16's middleware replacement) with nonce generation
- Accept that all pages become dynamically rendered
- See Next.js docs: https://nextjs.org/docs/app/guides/content-security-policy
