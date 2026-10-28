# 04. Hosting, Database, Domain, and Media Options

Reviewed against official provider pages on 2026-10-27. Provider quotas and terms can change; recheck immediately before a real deployment.

## Three feasible patterns

| Pattern | Hosting / runtime | DB | URL and images | Cost and constraints | Conclusion |
|---|---|---|---|---|---|
| A. PHP shared hosting | InfinityFree advertises PHP 8.4, MySQL 8.0/MariaDB 11.4, HTTPS, 5 GB storage and free subdomains. Upload via FTP. | Provider MySQL | Free provider subdomain; static images share web storage | Advertised $0 and no credit card. Resource limits apply. Exact DB quota, backup promise, Git deployment and SLA were not verified. Support policy prohibits standalone DB/API and file hosting use. | Candidate only if PHP is required and the host confirms the app-specific DB use and backup expectations. |
| B. Pages + D1 | Cloudflare Pages static site; Functions/Workers for future endpoints. | D1 SQLite-compatible managed database | `*.pages.dev`; static images in Pages. R2 later if needed. | $0 while within quotas. Workers Free: 100,000 requests/day and 10 ms CPU/request. D1: 5 GB total, 5M rows read/day, 100K rows written/day, no egress fees. D1 Free Time Travel: 7 days; export separately. | **Recommended for P0 and optional P1.** |
| C. PHP Docker + Neon | Cloud Run PHP container, scale-to-zero, `*.run.app`. | Neon Postgres Free | Static media in container build or R2/object storage; never use container filesystem for uploads | Cloud Run has usage-based free allowance, but billing account is required and overage is possible. Neon Free: 1 GB/project, 100 CU-hours/project/month, 5 GB network transfer, 5-minute scale-to-zero. | Viable fallback when PHP compatibility outweighs simplicity and billing risk is acceptable. |

## Provider details

### Cloudflare Pages / Workers / D1

- Pages is appropriate for static HTML/CSS/JS. Free Pages currently allows up to 20,000 files, 25 MiB per file, and 500 builds/month.
- Workers Free allows 100,000 requests/day, 10 ms CPU per request, and 128 MB isolate memory.
- D1 Free includes 5 GB of stored data total, 5 million rows read/day and 100,000 rows written/day. Exceeded daily quotas can cause queries to fail until reset; storage overage blocks writes.
- D1 Time Travel is always enabled on the new production backend. The Free plan can restore up to 7 days back; Paid up to 30 days. A restore overwrites in place. Use Wrangler export as a separate recovery copy.
- No separate database connection limit is presented as a classic TCP pool: D1 is accessed through a Worker binding. Use the supported binding API.

### InfinityFree

Its official homepage advertises free PHP/MySQL hosting, 5 GB disk and free subdomains. Its support policy describes the service as website hosting, not standalone database/API or file hosting. Exact free MySQL quota, recovery guarantee, uptime SLA and dependable Git push deployment were not established in this audit. Treat these as unresolved rather than assume unlimited or durable backup service.

### Render, Supabase, Neon as exclusions/alternatives

- Render Free web services sleep after 15 minutes without inbound traffic and lose local writes on restart/redeploy/spin-down. Render Free Postgres is 1 GB, expires after 30 days, and has no backups. Do not use it as the durable RSVP database.
- Supabase Free has 500 MB database, 1 GB storage and 5 GB egress, but pauses projects after a week of inactivity. Free plan has no automatic backups per current pricing comparison.
- Neon Free has 1 GB Postgres per project, 100 CU-hours/month, 5 GB egress and auto-suspends after 5 minutes. Free has a 6-hour restore history (up to 1 GB changes) and one manual snapshot; scheduled backups are unavailable.

## Domain

- Free subdomain: use the Cloudflare Pages-provided `pages.dev` hostname for the demo. This is a provider subdomain, not ownership of a free domain.
- Own domain: registration and renewal are paid. No domain is purchased or required for P0.
- Avoid relying on giveaway/free TLD promotions for a wedding link intended to remain stable.

## Image storage

- P0: optimize and bundle only approved static images. Keep the hero demo external until replaced with the couple's own licensed image; production should avoid dependence on a temporary sample URL.
- Later: Cloudflare R2 Free offers 10 GB-month, 1M Class A and 10M Class B operations per month, with no egress charge. The `r2.dev` public URL is rate-limited and explicitly for non-production. A custom R2 domain requires a domain in the same Cloudflare account.
- Guest photo uploads are deferred. They add abuse, privacy, moderation, storage and recovery responsibilities.

## Cost envelope

P0 target: $0 recurring hosting and database cost within free quotas; no domain purchase. P1 D1 target: $0 within D1/Workers Free quotas. Budget risk: exceeding quotas can stop requests/writes or require a paid plan. Set spend controls where available and do not enter a payment method unless the user approves.

## Official sources

- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
- [D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/) and [public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [InfinityFree hosting](https://www.infinityfree.com/) and [acceptable use overview](https://forum.infinityfree.com/t/what-can-i-do-with-my-hosting-account/49316)
- [Render free services](https://render.com/docs/free)
- [Supabase pricing](https://supabase.com/pricing)
- [Neon pricing](https://neon.com/pricing)
- [Cloud Run pricing](https://cloud.google.com/run/pricing)
