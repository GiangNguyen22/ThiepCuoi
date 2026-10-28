# 08. Deployment Runbook

This is a proposed procedure; the site has **not** been deployed and no Cloudflare account/service was created.

## Prerequisites

- Git repository containing only reviewed V2 files.
- Cloudflare account with Pages access. Use the free provider hostname; do not add a paid domain or paid plan.
- If P1 is later approved: D1 database, Wrangler CLI, and production binding. No database is required for P0.

## Local preview

Use VS Code Live Server, or from PowerShell run a local static server from `D:\ThiepCuoiV2` (for example `py -m http.server 4173`). Open `http://localhost:4173`. This is a local check only, not public hosting.

## P0 Pages deployment

1. Review the Git diff and ensure no files from the obfuscated old application, credentials, private data or unlicensed photos are present.
2. Push V2 to a Git provider repository.
3. In Cloudflare Pages, create a project from that Git repository.
4. Configure no build command and set the output directory to the project root (where `index.html` is located).
5. Deploy and wait for a successful build. Inspect the deployment log.
6. Open the generated `*.pages.dev` URL over HTTPS from desktop and a phone/mobile network.
7. Confirm image URLs, map destination, share behavior, mobile layout and title/social metadata.
8. Record the deployment URL and deploy identifier in the handover notes. Do not claim deploy success until verified.

## P1 D1, R2 & Admin deployment

1. Create a D1 database and bind it to the Pages Function using binding name `DB`:
   `npx wrangler d1 create thiepcuoi_d1`
2. Create an R2 Object Storage bucket and bind it using binding name `MEDIA_BUCKET`:
   `npx wrangler r2 bucket create thiepcuoi-media`
3. Apply versioned migrations to local D1 (`npx wrangler d1 migrations apply thiepcuoi_d1 --local`) and test before production.
4. Apply migrations to the production D1 database: `npx wrangler d1 migrations apply thiepcuoi_d1 --remote`.
5. Provision the initial production admin account securely via CLI: `node scripts/provision_admin.js --remote`.
6. Access `/admin.html` to log in, review the RSVP dashboard, moderate wishes, manage image uploads and album, update wedding details content, and configure wedding gift banking accounts / VietQR.
7. Verify inserts/validation from the public site, confirm no public list/query endpoint exposes guest records, then test redeploy persistence.
8. Export with Wrangler to a private location (`npx wrangler d1 export thiepcuoi_d1 --remote --output backup.sql`). Never commit production guest data to Git.
9. D1 Free Time Travel supports up to 7 days on production-backend databases; restoration is destructive. Practice restore and retain an independent SQL export.

## Rollback and recovery

- P0: use the previous successful Pages deployment/rollback feature; verify the restored URL.
- P1: first export current state, then use D1 Time Travel only after confirming the target point. A restore overwrites the database. Test on a non-production DB first when possible.
- Keep a private SQL export outside the repository. Test importing it into a clean database before real guest data is collected.

## Cost and security guardrails

- Keep the chosen plan at Free and do not enter payment details without owner authorization.
- Monitor Workers/D1 limits. Exceeding free quotas may reject requests/writes or require a paid upgrade.
- Do not store secrets in front-end code or Git. Do not collect unnecessary guest PII.
- Replace all demonstration event details and image assets before sharing with guests.
- Set no promise of uptime/backup beyond the provider's documented free-plan capabilities.
