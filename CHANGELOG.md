
# [2.0.0](https://github.com/dipakparmar/v2/compare/v1.11.0...v2.0.0) (2026-07-11)


### Bug Fixes

* **codeql:** address 20 static analysis alerts across osint and blog routes ([03347dd](https://github.com/dipakparmar/v2/commit/03347dd1480f40feee4fd24e2bd71ea325ac73b7))
* **docker:** bake NEXT_PUBLIC_GRAPHQL_ENDPOINT into build ([e557d44](https://github.com/dipakparmar/v2/commit/e557d44d24e6851f006da20e76c0b7ed67650a3e))
* **docker:** switch base image from Alpine to Debian slim ([0a573c9](https://github.com/dipakparmar/v2/commit/0a573c93dc1758bba51faa836b7474b4aab9b04e))
* **docker:** use groupadd/useradd for Debian base ([c961037](https://github.com/dipakparmar/v2/commit/c961037c48d61dbc9aebe6c9fb3dde4bba513b50))
* **icons:** use currentColor fill for GitHub and X icons to support dark mode ([ae3fd61](https://github.com/dipakparmar/v2/commit/ae3fd6191c5840227b1af64ed3a8d17e6c97f91e))
* **links:** don't fail the build when the GraphQL endpoint is unreachable ([07a95c1](https://github.com/dipakparmar/v2/commit/07a95c15cfb6be3061e1d55dbcde6d09f51890f1))
* **mdx:** keep unpaired asterisks literal in diagram labels ([5e161b3](https://github.com/dipakparmar/v2/commit/5e161b3f95e94304967f1a70b2dbbce2b2f58c87))
* **security:** resolve GitHub CodeQL code-scanning alerts ([4f86a78](https://github.com/dipakparmar/v2/commit/4f86a784b26911abee087f56e7779d7a1c1bdb5f))
* **timeoff-optimizer:** fix bugs in block selection and extension ([c86f5ec](https://github.com/dipakparmar/v2/commit/c86f5ec8a0b16c36c7e298f35221f6466d548ec7))


### Features

* **blog:** improve mobile blog list layout and animate new stamp ([32a9d4f](https://github.com/dipakparmar/v2/commit/32a9d4f90a8bcfa2298daedea4da988493cf9c9a))
* **docker:** add self-hosted Docker/GHCR build alongside Vercel ([b12a194](https://github.com/dipakparmar/v2/commit/b12a19470843ee4c8c1bdf6a4c477978a1146aa6))
* **logging:** add Cloudflare geo to request logs, rename t to time ([b91058b](https://github.com/dipakparmar/v2/commit/b91058b30ccb1e9c73a341e401a80fd9808b0604))
* **logging:** add proxy for production request access logs ([98f52d2](https://github.com/dipakparmar/v2/commit/98f52d23ea8289a3961e2f570a7ec7265064b35e))
* **logging:** include client IP in request logs ([a83e949](https://github.com/dipakparmar/v2/commit/a83e949a3fc83798a5b48e84fd0964c328907fef))
* **logging:** log user-agent and referer ([fa7c4e8](https://github.com/dipakparmar/v2/commit/fa7c4e8a605e272a4dedf0aecf9db849165e262e))
* **logging:** prefer CF-Connecting-IP for client IP ([d4d2735](https://github.com/dipakparmar/v2/commit/d4d27357341153d3494fdcbcf385c9b2f0a09a2c))
* **mdx:** add Quote pull-quote component ([9a2105f](https://github.com/dipakparmar/v2/commit/9a2105f88e376c438f6aa031d784a95a03b13a21))
* **mdx:** neutral color, wrapped/connected cluster children, larger diagram fonts ([07718d8](https://github.com/dipakparmar/v2/commit/07718d87c041183bd3ff9a813cfbf960ed8670c9))
* **mdx:** rich-text formatting and animated labels in diagrams ([060825a](https://github.com/dipakparmar/v2/commit/060825a7a4bbde8b7f62de4f58169b7676f92a76))
* **mdx:** support sublabels, side notes, and wider lanes in diagrams ([f431cd0](https://github.com/dipakparmar/v2/commit/f431cd0d179b5b4fa1c36af400d6bb686029cf76))
* **tools:** add Design Studio with multi-page carousels and templates ([2f8b8ba](https://github.com/dipakparmar/v2/commit/2f8b8ba2bdc685cfe30140b718fefc675275cf02))
* **tools:** add Music Tools hub with Smart 8D audio maker ([f8e7f2e](https://github.com/dipakparmar/v2/commit/f8e7f2ed96283ef8211b2621994926c682200ad1))
* **tools:** client-side vocal remover / stem splitter ([#110](https://github.com/dipakparmar/v2/issues/110)) ([b74ae64](https://github.com/dipakparmar/v2/commit/b74ae648ab038156f04f848f8a26fab35e2da2db))

# [1.11.0](https://github.com/dipakparmar/v2/compare/v1.10.0...v1.11.0) (2026-06-24)


### Bug Fixes

* **blog:** restore spacing below MDX code blocks ([d476423](https://github.com/dipakparmar/v2/commit/d47642356bc2b8229a351b6911a80bc755dd17ba))
* mark smooth scroll as intentional on html element ([b27e916](https://github.com/dipakparmar/v2/commit/b27e916e410220dcf8c90491d45c1da9873e7d2c))
* **mdx:** separate reference backlink from external source link ([fb4c4be](https://github.com/dipakparmar/v2/commit/fb4c4be7ddd44eb8c3fb17a0d62782a5cf7f3dcd))
* **timeoff-optimizer:** make access-code field a password input ([e42c55a](https://github.com/dipakparmar/v2/commit/e42c55a55b4b6d7bef5d72d740c02e4da2f02ec9))
* **timeoff-optimizer:** sync share URL on submit instead of every keystroke ([8a035d7](https://github.com/dipakparmar/v2/commit/8a035d74a0345ed89df55354a08e8b6fc6c0524c))


### Features

* **mdx:** add animated FlowDiagram/LaneDiagram components ([#103](https://github.com/dipakparmar/v2/issues/103)) ([b077403](https://github.com/dipakparmar/v2/commit/b0774031b14cf2236542995ae5dbf833000fc273))
* **mdx:** add opt-in human-stroke mode for rough-notation highlights ([56c3e40](https://github.com/dipakparmar/v2/commit/56c3e40252fa2214e00d4b0589c22d79ef8ba3d7)), closes [rou#notation](https://github.com/rou/issues/notation)
* **timeoff-optimizer:** add one-click calendar import and gated subscription feed ([531d97d](https://github.com/dipakparmar/v2/commit/531d97d539646ffb2809934f3f6427cd1a2415ed))
* **timeoff-optimizer:** add per-strategy booking lead time ([5a68fc8](https://github.com/dipakparmar/v2/commit/5a68fc8abba074b756159f40d0d8cccfa8f56b1c))
* **timeoff-optimizer:** allow custom calendar event titles and notes ([38ca00c](https://github.com/dipakparmar/v2/commit/38ca00c1c1f7b00a96aeada94bbf618af2108a57))
* **timeoff-optimizer:** preview custom calendar event text in the form ([d159cc7](https://github.com/dipakparmar/v2/commit/d159cc74e65d05dc3c7c1b1639f3ec18788f9645))
* **timeoff-optimizer:** replace empty-state icon with animated vacation scene ([efea077](https://github.com/dipakparmar/v2/commit/efea077ee6faa873313c9f2aa9a6bda2be8463e3))
* **tools:** replace generic top-border hover with pixel-grid ripple ([1fab051](https://github.com/dipakparmar/v2/commit/1fab0514dbcff80df4c15f2018fff21d588d459d))

# [1.10.0](https://github.com/dipakparmar/v2/compare/v1.9.0...v1.10.0) (2026-06-12)


### Bug Fixes

* **eslint:** align next.js lint setup ([1970703](https://github.com/dipakparmar/v2/commit/19707037f0b25f34af5f3ed155be7e0822aa665d))
* lint and type errors ([55dd0c1](https://github.com/dipakparmar/v2/commit/55dd0c1c946078a8145d60c19655244dad80497a))
* **provider-headers:** update title for auto-response suppression header ([cd5e1dd](https://github.com/dipakparmar/v2/commit/cd5e1dd01a82b0800b71088e08905d65e7bca61a))
* **spf:** bring SPF parsing and evaluation into RFC 7208 compliance ([d54ab6d](https://github.com/dipakparmar/v2/commit/d54ab6da56bfff461bae2fcc6410e4d2146e87f6))
* **spf:** correct regex matching for SPF mechanisms to include optional CIDR suffix ([89b9a8a](https://github.com/dipakparmar/v2/commit/89b9a8a4f51fe89da172f585927561b498f24843))
* **timeoff-optimizer:** correct efficiency metric to include already-taken days ([a669954](https://github.com/dipakparmar/v2/commit/a669954ece469343f02c9a953e93fe26e721c7cd))
* **timeoff-optimizer:** default date pickers to current month and style time inputs ([94d94b7](https://github.com/dipakparmar/v2/commit/94d94b7a3e960b97720f9fab493c72abdb04027e))


### Features

* **dmarc:** add RFC 9989 (DMARCbis) support with standard detection ([43bf237](https://github.com/dipakparmar/v2/commit/43bf237f972089fd3bbdbdefa7cdff2ef63dad34))
* **github:** add support for GitHub notification headers with detailed descriptions and filtering rules ([6cd7616](https://github.com/dipakparmar/v2/commit/6cd761606b0881a435454eaee497684991c54c2b))
* **mdx:** add Callout, Accent, References components with animations ([#95](https://github.com/dipakparmar/v2/issues/95)) ([0956fa4](https://github.com/dipakparmar/v2/commit/0956fa4055d32259796a94327917b4722be1f600)), closes [rou#notation](https://github.com/rou/issues/notation)
* **mdx:** add Highlighter component and improve MDX component system ([#96](https://github.com/dipakparmar/v2/issues/96)) ([6f3e6b0](https://github.com/dipakparmar/v2/commit/6f3e6b0f1c98d21daf0ae4d17f2428a343e063ef)), closes [rou#notation](https://github.com/rou/issues/notation) [rou#notation](https://github.com/rou/issues/notation) [rou#notation](https://github.com/rou/issues/notation) [rou#notation](https://github.com/rou/issues/notation) [rou#notation](https://github.com/rou/issues/notation)
* **message-header-auth:** add ATPS support per RFC 6541 ([561b801](https://github.com/dipakparmar/v2/commit/561b801ec344bdcc2626c1fdbfab3d89fc8addc8))
* **mha:** add clickable domain and IP links across the tool ([bc11a65](https://github.com/dipakparmar/v2/commit/bc11a65cf27b04517cf73fd2332606d891c96465))
* **mha:** add email header value parsing support with rich popover details ([49bb555](https://github.com/dipakparmar/v2/commit/49bb555a076161c1dd26eba87725f774e4e3a8ff))
* **mha:** enrich parsed header values ([cded3f0](https://github.com/dipakparmar/v2/commit/cded3f0ee4c26ea0da3c371f09e18496ca8b6e5d))
* **provider-logos:** add 'zoho-mail' to provider logo domains ([49ce5bc](https://github.com/dipakparmar/v2/commit/49ce5bc0265615cdf3d279cc56a68248700c20b6))
* **routing:** add short link tools.dipak.io/mha for message header analyzer ([7ed24d6](https://github.com/dipakparmar/v2/commit/7ed24d6f93d34e65111223f1bb31e058b6df5dc9))
* **seo:** migrate to native host-aware sitemap ([c42bc5a](https://github.com/dipakparmar/v2/commit/c42bc5a698e61f0796e86bb7a79d22beab5b62ae))
* **spf:** add expandSpfMacros and hasMacros functions for macro handling ([96d00ad](https://github.com/dipakparmar/v2/commit/96d00ad86e26f60e516f2faa40443bc11353f658))
* **spf:** implement SPF tree structure and visualization for mechanisms ([d2e25ac](https://github.com/dipakparmar/v2/commit/d2e25ac25b1444a58035f43bc67a8761734a8756))
* **timeoff-optimizer:** add already-taken time off tracking and geo-detection ([f395173](https://github.com/dipakparmar/v2/commit/f39517394bcb5e8cd9fee326e0566c514e4928f5))

# [1.9.0](https://github.com/dipakparmar/v2/compare/v1.8.0...v1.9.0) (2026-05-22)


### Bug Fixes

* **cert-tools:** prevent certificate tab navigation lockup ([5e62734](https://github.com/dipakparmar/v2/commit/5e62734e3931dd4b8145cba7b507fd1c13943927))
* **csp:** add img.logo.dev to img-src in Content Security Policy ([0faf7e3](https://github.com/dipakparmar/v2/commit/0faf7e31ab38e770e32d0bda5e8358d5b4b9d631))
* **map:** correct markercluster types ([b5fbae3](https://github.com/dipakparmar/v2/commit/b5fbae32a133dde55aa9e24d2e17cc29a3abc2dd))
* **mha:** anchor auth and routing annotations ([c970d46](https://github.com/dipakparmar/v2/commit/c970d46b2934458a0e00b980dd5144906d887ca3))
* **mha:** optimize header list for mobile ([6b9971a](https://github.com/dipakparmar/v2/commit/6b9971a84b0a4ee66afdcff3546da79a876f6f5f))
* **mha:** pin mobile annotation sheet to viewport ([af771dc](https://github.com/dipakparmar/v2/commit/af771dc113fa1ab0e585afe2073ca88deeb5358e))
* **mha:** prevent header row shift on annotation ([29ccae5](https://github.com/dipakparmar/v2/commit/29ccae53971f895820aba8b284bf3dd8c5ef94f7))
* **mha:** prevent mobile header id collisions ([eda78e5](https://github.com/dipakparmar/v2/commit/eda78e5a44b8814821e692b4b3a4b304e10fbf1a))


### Features

* add knip configuration and script to package.json ([d22d2bd](https://github.com/dipakparmar/v2/commit/d22d2bd2a0306aa894acd0a6413f5ae60fbb8ee1))
* **message-header-analyzer:** add opt-in live auth dns checks ([505009c](https://github.com/dipakparmar/v2/commit/505009c37e7a15c613ed6c3f2a97e45c9cac1485))
* **mha:** add documented Salesforce org type header ([29b954f](https://github.com/dipakparmar/v2/commit/29b954f082eafeec8d135cc685ff4e10f8b1aefa))
* **mha:** add microsoft and zoho header guides ([cd5c503](https://github.com/dipakparmar/v2/commit/cd5c503a1ebd7ee63d02deb71a62c125cfb66d4f))
* **tool:** add vacation time off optimizer tool ([#83](https://github.com/dipakparmar/v2/issues/83)) ([eab130f](https://github.com/dipakparmar/v2/commit/eab130f164934b4af7abddbd86a37259ee91aa2c))

# [1.8.0](https://github.com/dipakparmar/v2/compare/v1.7.0...v1.8.0) (2026-05-12)


### Features

* **message-header-analyzer:** add provider detection header guides and references ([#70](https://github.com/dipakparmar/v2/issues/70)) ([ce2ad8e](https://github.com/dipakparmar/v2/commit/ce2ad8e2d7599483a4876a382b7524f342a1d780))

# [1.7.0](https://github.com/dipakparmar/v2/compare/v1.6.0...v1.7.0) (2026-05-09)


### Bug Fixes

* **whois:** avoid fallback on confirmed unregistered domains ([97ba2ea](https://github.com/dipakparmar/v2/commit/97ba2ea68f64080cc0ed9f24b89b82353784d564))
* **whois:** degrade gracefully on referral timeouts ([c50e986](https://github.com/dipakparmar/v2/commit/c50e986f11737fcb8b3214915e186336e1512118))


### Features

* **blog:** add Apple Home Key vs UniFi Touch Pass article with diagrams ([28347e3](https://github.com/dipakparmar/v2/commit/28347e33925e7aa2dcbeb9b45e97bb7527c39173))
* **blog:** add MDX citation components ([fe161f8](https://github.com/dipakparmar/v2/commit/fe161f8db54927723afe0b058f7ba6485d61def4))
* **blog:** add priority prop to FigureImage for LCP optimization ([f365456](https://github.com/dipakparmar/v2/commit/f365456e178f6d4feec2f98d71f49c5c248ada12))
* **blog:** improve MDX rendering and captions ([03225ab](https://github.com/dipakparmar/v2/commit/03225ab0a031ad3ea660f10d179bf3b0ba66d186))
* **osint:** add Security Posture, Site Identity, and Threat & History sections ([#69](https://github.com/dipakparmar/v2/issues/69)) ([d225bac](https://github.com/dipakparmar/v2/commit/d225baccad0193c6bc3cb24425ed71768bce09af))
* **routing:** add dedicated whois subdomain ([55745e6](https://github.com/dipakparmar/v2/commit/55745e695c5ddad92a37993229767c9f14b6eecd))
* **whois:** add fallback parsing for non-RDAP domains ([877b022](https://github.com/dipakparmar/v2/commit/877b022a98a51b588d42dbfd7342ef4fd4803c2e))
* **whois:** implement detailed status badges with tooltips for EPP status information ([e2fb5b5](https://github.com/dipakparmar/v2/commit/e2fb5b58e0be40bb05e5e49ef9aa434fc99be9f4))

# [1.6.0](https://github.com/dipakparmar/v2/compare/v1.5.0...v1.6.0) (2026-04-02)


### Features

* **blog:** dynamic OG image generation ([#65](https://github.com/dipakparmar/v2/issues/65)) ([dd1cb9d](https://github.com/dipakparmar/v2/commit/dd1cb9df5684f3891e368a6d64b85e6b2b0779d7))
* **blog:** improve blog list, search, and post header ([#63](https://github.com/dipakparmar/v2/issues/63)) ([ad5070a](https://github.com/dipakparmar/v2/commit/ad5070a117f272dd1c0ed9787f5f958a865cd73e))

# [1.5.0](https://github.com/dipakparmar/v2/compare/v1.4.0...v1.5.0) (2026-03-31)


### Bug Fixes

* add unpkg.com to script-src in Content Security Policy ([c1b2a66](https://github.com/dipakparmar/v2/commit/c1b2a66723c2982848c989a2f4bf2cf191778d3b))
* **apple-secret:** remove unnecessary DER-to-raw signature conversion ([3560241](https://github.com/dipakparmar/v2/commit/35602414a45b9d7e3083276138abd2f87ea8e9ce))
* correct sentry mcp def ([a227a2d](https://github.com/dipakparmar/v2/commit/a227a2dcbeb644d4b32bbf434b86cc7a92ec70b4))
* **csp:** allow unsafe-eval in development mode for React debugging ([8fe2fc0](https://github.com/dipakparmar/v2/commit/8fe2fc0330fa80b4aba8338ba7a94330ed752e50))
* **docs:** update commands to use 'bun run' for consistency ([1146c3b](https://github.com/dipakparmar/v2/commit/1146c3b01d0ff1168fb1b79a054f9a6d612a77ba))
* improve header analyzer UX and parsing ([045ca3a](https://github.com/dipakparmar/v2/commit/045ca3a9321031f8a40e1594f3cc6abfdc68170e))
* **ip:** eliminate double API request on lookup ([a5c0c75](https://github.com/dipakparmar/v2/commit/a5c0c751bcd364ed1ee8a067f4cdb88ca395b8b1))
* **ip:** handle numeric ASN input in stripASPrefix ([d766dae](https://github.com/dipakparmar/v2/commit/d766dae3c3b8b576249760d084a102a69056d744))
* **ip:** override accordion content height for lazy-loaded sections ([fae115f](https://github.com/dipakparmar/v2/commit/fae115f6f35cd1492a51c440cc2a7b261d7d16a6))
* **ip:** replace defunct BGPView API with RIPEstat-only ([1dc1e40](https://github.com/dipakparmar/v2/commit/1dc1e40a49c3baf23364facd7604dbc1e26c8a55))
* **ip:** use unique keys for peer list items ([39eecad](https://github.com/dipakparmar/v2/commit/39eecadd271bb16d54a3845d8a77d954751fa990))
* move comment marker outside accordion trigger to avoid nested buttons ([68993ad](https://github.com/dipakparmar/v2/commit/68993ad4e31db0141a50dbe7c3ff6ef05128dd95))
* remove overrides for React type definitions in package.json ([2913ba1](https://github.com/dipakparmar/v2/commit/2913ba1abf6b8d18a2ee0180d317562650f8be1c))
* resolve hydration mismatch and speed up snowfall animation ([d175a2b](https://github.com/dipakparmar/v2/commit/d175a2b743059289bd3ff95a7b0b6e6f8b6e2e8b))
* resolve React DOM warnings for mouseX prop leak and script rendering ([3e9c1e4](https://github.com/dipakparmar/v2/commit/3e9c1e4c8742116f70013376c183b9e6053282ef))
* **tools:** replace deprecated Github with GithubIcon from lucide ([3b259f7](https://github.com/dipakparmar/v2/commit/3b259f7516f59d36d28c56ff9054e7aa3e93347c))
* update Sentry DSN configuration for development environment ([707d704](https://github.com/dipakparmar/v2/commit/707d7049fc127d91b0a79ca3f28b1e57cffda906))


### Features

* add Apple Client Secret Generator tool ([a91507d](https://github.com/dipakparmar/v2/commit/a91507dfbf3c9859e64da4825664ed96686b455d))
* add canonical URLs to metadata for IP Information and Certificate pages ([c9e5143](https://github.com/dipakparmar/v2/commit/c9e51434b497d434788eb1c04ce8afff2bda95f1))
* add educational annotation comments to message header analyzer ([3faf280](https://github.com/dipakparmar/v2/commit/3faf280cbf484f482d21dea71ab2b6c54314fb7b))
* add email header parser library ([6aa8b16](https://github.com/dipakparmar/v2/commit/6aa8b16af672a9ff5a212e721e6ea939779f8d99))
* add haptic feedback to copy actions and form submissions ([fd50617](https://github.com/dipakparmar/v2/commit/fd50617c8fbea15f5aa0e11d7a645e6538063b12))
* add haptic wrapper components for shadcn/ui primitives ([4f5d569](https://github.com/dipakparmar/v2/commit/4f5d56944ece50c27823ebfb1f4ccda91b5432b5))
* add HapticsProvider context and useHaptics hook ([7c14b46](https://github.com/dipakparmar/v2/commit/7c14b467032d4e6175b627a26ca828122593ed8e))
* add HapticsProvider to all route group layouts ([b22f276](https://github.com/dipakparmar/v2/commit/b22f276ff7cff57c6c52b151259f1cf0563e1fd7))
* add IP Information tool with detailed IP lookup and geolocation data ([b5073eb](https://github.com/dipakparmar/v2/commit/b5073eb98d1b484ddfe98e547c95189f12a7ff8d))
* add Message Header Analyzer tool page and register in tools index ([ee906b9](https://github.com/dipakparmar/v2/commit/ee906b9e5727721706b3e64a658efd3f9572b9eb))
* add message header analyzer UI components ([82208df](https://github.com/dipakparmar/v2/commit/82208df730dde9d82e0b820224674cdb3bba70b1))
* add message viewer with sandboxed HTML preview ([ea25b11](https://github.com/dipakparmar/v2/commit/ea25b11465069c52d669545e0f48e1fbdc6b9b5e))
* add Password Generator tool with animated panda strength visualizer ([ac769a6](https://github.com/dipakparmar/v2/commit/ac769a66dba2b1187a3b18d6ca207ea3df66c68b))
* add PlaceAutocomplete component for location search with Photon API integration ([c128f2c](https://github.com/dipakparmar/v2/commit/c128f2cda98970e3bf0728c57ef06f9d559eb182))
* add react-grab and mcp scripts for development environment ([725fca4](https://github.com/dipakparmar/v2/commit/725fca4f0c486024b578ba360f0fb541dc3a8518))
* add redirects for dipak.tech to various subdomains ([46d42b4](https://github.com/dipakparmar/v2/commit/46d42b4b622fe560860df4e63593371227ce98ec))
* add route handling for IP API based on host and user-agent ([59c2119](https://github.com/dipakparmar/v2/commit/59c2119c19e7efacd7eeb4eaeb33c0d18c3a312c))
* add WHOIS Lookup tool and update card styling in results ([a75eee3](https://github.com/dipakparmar/v2/commit/a75eee3955bddf24b6c9a8958f8660a6bf899c36))
* **blog:** add MDX blog with tags, search, RSS, and syntax highlighting ([#62](https://github.com/dipakparmar/v2/issues/62)) ([5102702](https://github.com/dipakparmar/v2/commit/510270272096d923ec61b11041c9f553f7f83627))
* **bunfig:** add initial configuration for package installation rules ([e65607d](https://github.com/dipakparmar/v2/commit/e65607d439f5257fee25f855092854e8c1234415))
* enhance redirect configuration with validation and error handling ([d9f02a9](https://github.com/dipakparmar/v2/commit/d9f02a98beb607ef3d5f7b36fa55e8617253c979))
* improve annotation system with smart balancing, expanded header DB, and connector line timing ([4be33f1](https://github.com/dipakparmar/v2/commit/4be33f1075b2c776aafe4d6a84d2c62a91273db9))
* improve error handling and validation in IP and DNS resolution functions ([36657be](https://github.com/dipakparmar/v2/commit/36657be85d9f60dfdbb4da65b7c6a5a3e88a2bf5))
* **ip:** add BGP data clients (RIPEstat + BGPView) ([27c2f0f](https://github.com/dipakparmar/v2/commit/27c2f0fc79f6c68aab4cc5984a9c660989759024))
* **ip:** add network intelligence API endpoint ([ec3cdf5](https://github.com/dipakparmar/v2/commit/ec3cdf5cda772f76f947ff67fe0ecf6d76554ac8))
* **ip:** add network intelligence types ([5fdcb94](https://github.com/dipakparmar/v2/commit/5fdcb94f99b76f34acfe04aa92f11eb2e3994ed0))
* **ip:** add network intelligence UI with parser, ASN view, and expandable sections ([f85c810](https://github.com/dipakparmar/v2/commit/f85c810335dd1f9fe7e6c27be2254816f2b38a60))
* **ip:** add smart network input parser ([43016c5](https://github.com/dipakparmar/v2/commit/43016c566070dfa3e701660f7b81fb1719c9b0f5))
* **ip:** integrate parser into IP API for input normalization ([f671a03](https://github.com/dipakparmar/v2/commit/f671a0354ad4c74d37ed05902a12092d6a87e7e4))
* **ip:** replace linear AS path display with SVG DAG graph ([cfe41c9](https://github.com/dipakparmar/v2/commit/cfe41c94214a60a4434379af01f123800ea320f5))
* **ip:** update page title and description for network intelligence ([1de3acc](https://github.com/dipakparmar/v2/commit/1de3acc73ba01fd097267ff3e51e8cfc11481a91))
* migrate component imports to haptic wrappers ([f026fc5](https://github.com/dipakparmar/v2/commit/f026fc57f63ce9eab4c6c039e44d1423c3cb073a))
* migrate IP route to new API structure and update WhoisLookup component for IP details ([36639e4](https://github.com/dipakparmar/v2/commit/36639e4b088add01f4d7dd859a234d734236f367))
* refactor IPInfoPage to use Suspense for loading state and separate IPInfoContent component ([131e04b](https://github.com/dipakparmar/v2/commit/131e04b782e8e0506c05215416ca63811f6acea2))
* **tools:** redesign tools page with zigzag bento grid and hover-expand cards ([218aba2](https://github.com/dipakparmar/v2/commit/218aba244d2887c8569ba477f197713023e2cf12))
* update redirect rules to exclude localhost and Vercel previews ([3f421f8](https://github.com/dipakparmar/v2/commit/3f421f8a7bf7874010f208cbe292874d3071a948))


### Reverts

* Revert "chore(deps): bump streamdown from 1.6.11 to 2.0.1 in the prod-deps group (#44)" ([44b5e47](https://github.com/dipakparmar/v2/commit/44b5e47ef8a027d1a360650109a8c0b0d1db1dc3)), closes [#44](https://github.com/dipakparmar/v2/issues/44)

# [1.4.0](https://github.com/dipakparmar/v2/compare/v1.3.0...v1.4.0) (2026-01-13)


### Bug Fixes

* **api:** ensure subject and issuer fields are stringified objects ([6681751](https://github.com/dipakparmar/v2/commit/668175198c00c8b2d98100f42cc2e5b86283bb9b))
* **certificates:** replace Link with router.back for navigation ([fbf587c](https://github.com/dipakparmar/v2/commit/fbf587c241282c74d0d2222f398c86464123fff1))
* **container-registry:** add server-side token auth for public images ([e44d316](https://github.com/dipakparmar/v2/commit/e44d31672262bc62aa30c118f86628bc2eede313))
* **container-registry:** use GET to fetch signed blob URLs and improve auth ([fbe6cd8](https://github.com/dipakparmar/v2/commit/fbe6cd81e7a55278efd4dc350880015a23557f27))
* **ct-logs-viewer:** sync search query with URL for better navigation ([9f65df5](https://github.com/dipakparmar/v2/commit/9f65df5d45fd44413a73d4d2936f54c53a95e23c))
* **ct-logs-viewer:** use buildToolsHref for certificate view links ([85a146e](https://github.com/dipakparmar/v2/commit/85a146ebf01572b16e0705d1fa9cb5194842a83c))
* **go-pkg:** use buildHref for package URL construction ([8fb3c3e](https://github.com/dipakparmar/v2/commit/8fb3c3e06fe4507428d5ab4fe58c050d2bb8a101))
* **go-pkg:** use single go-import meta tag with catch-all route ([ea83da2](https://github.com/dipakparmar/v2/commit/ea83da2513f7622dcab4c97993d9ac1d83142919))
* **routes:** update go.pkg.dipak.io route to support wildcard paths ([c406a53](https://github.com/dipakparmar/v2/commit/c406a53dbcf93a06166d71e932c4dd4e765ad886))
* **ui:** add h-auto to TabsList for improved layout flexibility ([6c1058c](https://github.com/dipakparmar/v2/commit/6c1058cdf0d3585c681d7ade4e5b56c4c09e360e))
* update external certificate link to new ct-logs URL ([b79e1a5](https://github.com/dipakparmar/v2/commit/b79e1a5be09deb19e3491723694c50a16a829bf3))
* **whois-lookup:** prevent redundant lookups on local query edits ([374903f](https://github.com/dipakparmar/v2/commit/374903fd5f0e0888db64561c7cbd78a63601ccb5))


### Features

* add .mcp.json config for next-devtools integration ([4a258c4](https://github.com/dipakparmar/v2/commit/4a258c48a835ec57f5f5100de2ebd0f48d3af535))
* add certificate details view and enhance Go package metadata ([88d7678](https://github.com/dipakparmar/v2/commit/88d76787bbf8a4f9b6cd8b9bb4db750f635eb9af))
* add CLAUDE.md for project guidance and architecture overview ([74f81cc](https://github.com/dipakparmar/v2/commit/74f81ccddc8c50aaff21bec421870693a1ac65f8))
* add schema-dts JSON-LD across sites ([#47](https://github.com/dipakparmar/v2/issues/47)) ([948f683](https://github.com/dipakparmar/v2/commit/948f6833b233bc3c69bf5da6c0c260d75547e7ad))
* **api:** add certificate and DNS resolution endpoints ([ae13aeb](https://github.com/dipakparmar/v2/commit/ae13aebaeaa1a0f3ef532417675fa0a82c337643))
* **api:** add certificate validation type detection (DV/OV/EV) ([64db8d9](https://github.com/dipakparmar/v2/commit/64db8d9ee98c5ab7a5ec1be8a39cceef87d19519))
* **api:** add fetch-cert route to retrieve TLS certificate details ([7be6c26](https://github.com/dipakparmar/v2/commit/7be6c2662097864543e2f8a89d8a6b450690f20c))
* **api:** add GitHub release notes endpoint with caching and rate limiting ([9b5b9a4](https://github.com/dipakparmar/v2/commit/9b5b9a4882761b666e3f736c05858a3089925143))
* **api:** add RDAP-based WHOIS endpoint for domain, IP, and ASN lookups ([271147e](https://github.com/dipakparmar/v2/commit/271147e6e781da3ad7dbb39b6f02d817042c662a))
* **certificates:** add certificate tools and detailed view pages ([d6ae3fb](https://github.com/dipakparmar/v2/commit/d6ae3fbc2c653560e7d9035d31340c3f90a87337))
* **container-registry:** add container registry routes and UI ([16a7327](https://github.com/dipakparmar/v2/commit/16a7327483c8e0f2c5b91f2fdea46ceed4fc86d1))
* **github-release-notes:** add initial pages and UI for release notes tool ([43588f4](https://github.com/dipakparmar/v2/commit/43588f43986901c3013429bfc59f567208dc2bcc))
* **go-pkg:** add package view page with copy button and 404 handling ([f698ac7](https://github.com/dipakparmar/v2/commit/f698ac70961a2b162bde0ba18930998ec09c5edb))
* **go-pkg:** pass host prop to PackageCard for SSR compatibility ([b131b05](https://github.com/dipakparmar/v2/commit/b131b0554d6481af737bdf1931e3c713d3202523))
* **home:** replace BlurFadeText with animated waving hand emoji ([74dfb9d](https://github.com/dipakparmar/v2/commit/74dfb9d4992e790c592cc578722c0ec8c6665515))
* **home:** replace react-markdown with Streamdown for rendering summary ([42ebb64](https://github.com/dipakparmar/v2/commit/42ebb646f3bfb5d3803b1a039b8e17d3a0a6a7ac))
* **home:** update contact section to use primary theme colors ([106176d](https://github.com/dipakparmar/v2/commit/106176d252ceb0714bba839caa78d8f7400edf76))
* improve release notes tool loading and display behavior ([536f71f](https://github.com/dipakparmar/v2/commit/536f71ff6feff32c6a7ef483d875d275a6b8ef0b))
* **meta:** add og:logo meta tag with logo URL for improved sharing ([8e5db87](https://github.com/dipakparmar/v2/commit/8e5db874a057d25a8ccd7275ea0405f3d42f1a81))
* **mode-toggle:** add system theme and animated icon transitions ([d38d475](https://github.com/dipakparmar/v2/commit/d38d475bdfce813e567742d90699e11ad8a8e299))
* **mode-toggle:** refactor mounted state management using useSyncExternalStore ([03e98ba](https://github.com/dipakparmar/v2/commit/03e98ba4aa18d2381bc5bb6a63e63c4b06dbf4f9))
* **og-utils:** add utility module for Open Graph image generation ([1a4b0b5](https://github.com/dipakparmar/v2/commit/1a4b0b5749af9ed60066ce4614705f4a16d25009))
* **og:** add dynamic OG image URL generation and metadata integration ([122f208](https://github.com/dipakparmar/v2/commit/122f2089f5434a384e781e8aa40aab13325fe9d7))
* **osint:** rename whois tool to osint and enhance UI/UX ([fc2aca0](https://github.com/dipakparmar/v2/commit/fc2aca00f6ded7487f3d9365b58be910937544cd))
* **routing:** centralize tools path logic in tool-routing util ([dfbc76c](https://github.com/dipakparmar/v2/commit/dfbc76c1dfb038c7e41c9df48536cbca65b4c3a9))
* **routing:** update package and tool pages to use host-aware URLs ([4e814b6](https://github.com/dipakparmar/v2/commit/4e814b6e73fa559588ab02128c8b93b7d78efc40))
* **sentry:** complete error monitoring integration ([#46](https://github.com/dipakparmar/v2/issues/46)) ([eca5cdd](https://github.com/dipakparmar/v2/commit/eca5cddcfd63d5651e5306f775496a1d26d57a0b))
* **serial-console:** add draggable/resizable desktop window with state restore ([cc91433](https://github.com/dipakparmar/v2/commit/cc9143302f7cf682edcc90cdf4a4c1a36720b14f))
* **serial-console:** rebrand to "Web Terminal" and add tabbed sessions ([159e081](https://github.com/dipakparmar/v2/commit/159e0815e8a68b1d637862a61f47145d5ccc7138))
* **styles:** enhance global styles with new themes and color variables ([11ef7a7](https://github.com/dipakparmar/v2/commit/11ef7a767a724b70bf459c0374a368170141bdfb))
* **tools:** add developer tools section with host-based routing ([7f68105](https://github.com/dipakparmar/v2/commit/7f681055b6d3d6687fd0736abf3b26d3a6d42610))
* **tools:** add Serial Console tool with web-based terminal ([d63d413](https://github.com/dipakparmar/v2/commit/d63d413259150bf778f430d0db85d324f96474c3))
* **tools:** add ToolsLayout and update tools list ([708f236](https://github.com/dipakparmar/v2/commit/708f236fe3796abbfb1494acaa08696159e4b411))
* **tools:** dynamic tool path resolution and footer addition ([4f540d6](https://github.com/dipakparmar/v2/commit/4f540d6a088a54ddabc7ee2300c208f57a44e84a))
* **ui:** add Alert, Input, Spinner, and Tabs components ([f136770](https://github.com/dipakparmar/v2/commit/f1367709b7451563f46d290f7d0151591c074f0d))
* **ui:** add Checkbox component using Radix UI and Hugeicons ([95ac8ff](https://github.com/dipakparmar/v2/commit/95ac8ffd48627f9c674f9c7513eb1a007e9c55bc))
* **ui:** add Skeleton component for loading placeholders ([1acacf2](https://github.com/dipakparmar/v2/commit/1acacf2981571a089e68527525a9a96e30656637))
* **ui:** update code and button styles for improved light mode support ([547aa32](https://github.com/dipakparmar/v2/commit/547aa3238229cf3354d80400381d71a22810e829))
* **ui:** update component config, add alert-dialog, and enhance dependencies ([791abe0](https://github.com/dipakparmar/v2/commit/791abe0e6ab55a74172c16ac4b7da71f4145a377))
* **whois:** add Whois lookup tool UI and page ([b2fb793](https://github.com/dipakparmar/v2/commit/b2fb79301343ee797078d0afdab99f831d353a64))

# [1.3.0](https://github.com/dipakparmar/v2/compare/v1.2.0...v1.3.0) (2026-01-10)


### Bug Fixes

* update Content Security Policy to include additional sources for connect and img directives ([730aae1](https://github.com/dipakparmar/v2/commit/730aae19001cfdfd80c1ac3181c52188ffc7c629))
* update Content Security Policy to include additional sources for script and connect directives ([3936d75](https://github.com/dipakparmar/v2/commit/3936d7563b5a51154458e2b9797f703b9430a2da))
* update max-width values for responsive design in Home component ([a3a078c](https://github.com/dipakparmar/v2/commit/a3a078c4a6aa2d7bdeba49fabb04b807b8ce5705))
* update node engine version specification in package.json ([0716622](https://github.com/dipakparmar/v2/commit/07166223b6cdf4ff6013f11bc36ae2f8056916dc))


### Features

* add metadata for canonical URLs in Home and Resume pages ([64d3894](https://github.com/dipakparmar/v2/commit/64d3894f1e91e7666bb79bcd85f3f356a2b97aa5))
* add viewport configuration and conditional Google Analytics script loading ([b1ff671](https://github.com/dipakparmar/v2/commit/b1ff671fa2dd9d8191e48e805d4e473f67e53353))
* add webhook revalidation for links and static generation support ([0d8c27d](https://github.com/dipakparmar/v2/commit/0d8c27d4a7e333c62342d4008ce8dbe664a2f8af))
* **go-pkg:** add dynamic route for package metadata and redirects ([#43](https://github.com/dipakparmar/v2/issues/43)) ([7443d63](https://github.com/dipakparmar/v2/commit/7443d632afc000e8bcec1b6fc2620751e049b625))
* **go-pkg:** add go.pkg.dipak.io support with rewrites and UI ([#42](https://github.com/dipakparmar/v2/issues/42)) ([9c8babc](https://github.com/dipakparmar/v2/commit/9c8babcab215c1a7762f0d7be39ad6f32d9a8fbb))

# [1.2.0](https://github.com/dipakparmar/v2/compare/v1.1.0...v1.2.0) (2025-12-09)


### Features

* add resume page [draft] ([13b578f](https://github.com/dipakparmar/v2/commit/13b578fa01dc0b5a990e3d949ec5df1d0847de3b))
* migrate to bun from pnpm ([a480bed](https://github.com/dipakparmar/v2/commit/a480bedef2da1dee24634745d54216813eb5dda9))
* migrate to next@16.0.7 from 15.1.1 ([d1117c1](https://github.com/dipakparmar/v2/commit/d1117c18ef6dfb9f0761bf6b1852179fcdfa7778))
* port dipak.bio site to this ([#32](https://github.com/dipakparmar/v2/issues/32)) ([a9d4f6f](https://github.com/dipakparmar/v2/commit/a9d4f6f79d97740555cc723e7061484948095f04))

# [1.1.0](https://github.com/dipakparmar/v2/compare/v1.0.0...v1.1.0) (2024-09-30)


### Features

* **security:** add security headers ([#3](https://github.com/dipakparmar/v2/issues/3)) ([57b74d7](https://github.com/dipakparmar/v2/commit/57b74d74962b4c15dd146d7184489b4ed4f34594))

# [1.0.0](https://github.com/dipakparmar/v2/compare/a5deb06755c21985380f57bdf3724201cb7fb2f6...v1.0.0) (2024-07-01)


### Features

* **ui:** update landing page ([#2](https://github.com/dipakparmar/v2/issues/2)) ([a5deb06](https://github.com/dipakparmar/v2/commit/a5deb06755c21985380f57bdf3724201cb7fb2f6))
