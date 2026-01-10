# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website (dipak.tech) built with Next.js 16, serving multiple sites through host-based routing:
- **dipak.tech** → Portfolio site (`/home`, `/resume`)
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
- `go.pkg.dipak.io/:package` → `/go-pkg/:package`
- `cr.dipak.io/v2/*` → `/container-registry/v2/*` (Docker Registry V2 API)
- `cr.dipak.io` → `/container-registry` (landing page)
- `dipak.bio` → `/links`
- Default `/` → `/home`

### Key Directories

- `src/components/ui/` - shadcn/ui components (new-york style)
- `src/components/magicui/` - Animation components (blur-fade, dock)
- `src/lib/github.ts` - GitHub API client with retry logic and stale-while-revalidate caching
- `src/lib/container-registry.ts` - Container registry proxy logic (Docker Hub & GHCR APIs)
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

Authorative source of truth for dependencies is `package.json`. Always refer to it when adding or updating dependencies.
