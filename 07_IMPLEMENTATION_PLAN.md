# 07. Implementation Plan

Estimates assume one developer and a small static P0; calendar time depends on content and provider account setup.

| Phase | Goal and work | Files / dependencies | Estimate | Acceptance and risks |
|---|---|---|---:|---|
| 0. Audit | Review old app/schema/assets and document verified vs unknown facts. Keep old source untouched. | `D:\ThiepCuoi\`; no execution. | 0.5-1 day | `01_SOURCE_AUDIT.md` complete. Hidden PHP code prevents runtime audit; do not reuse it. |
| 1. Scope/architecture | Confirm P0/P1/P2; choose Pages; list quotas/costs, sitemap and UI direction. | `02_PRODUCT_SCOPE.md`, `03_ARCHITECTURE.md`, `04_DEPLOYMENT_OPTIONS.md`, `06_UI_UX_PLAN.md`. | 0.5-1 day | User accepts platform and free-tier/backup limits before code. |
| 2. Data/deploy design | Define future P1 schema, migration, privacy rules, export/restore and deployment procedure. | `05_DATABASE_DESIGN.md`, `08_DEPLOYMENT_RUNBOOK.md`. | 0.5-1 day | P0 has no DB; no volatile filesystem persistence assumed. |
| 3. Foundation | Create clean V2 static project, Git, local preview instructions and README. | `D:\ThiepCuoiV2\`, `README.md`. | 0.5 day | Clean checkout serves the page; no old source changes or machine paths. |
| 4. P0 invitation | Responsive hero, message, date/countdown, schedule, map, gallery and share. Optimize/select approved media. | `index.html`, `styles.css`, `app.js`, approved media. | 2-4 days | Desktop/mobile checks pass, no horizontal overflow, links work, text readable. Unlicensed sample images are a launch blocker. |
| 5. P1 backend (deferred) | Add D1 and validated RSVP/wishes only if approved. | Function source, D1 migrations, bindings. | 1-2 days | Valid/invalid submissions behave correctly; DB survives redeploy; no public guest list; export/restore tested. |
| 6. QA/security | Browser checks, accessibility, Vietnamese encoding, error handling, secret/license scan. | P0 files; add tests only when useful. | 0.5-1 day | Acceptance checklist passes. No secrets; reduced motion works. |
| 7. Deploy | Link Git to Pages, configure output, deploy and verify URL/TLS/logs. | Cloudflare Pages dashboard, Git repository. | 0.5 day | Public HTTPS URL works on a phone and does not rely on the owner's PC. No account/service is created without approval. |
| 8. Handover | Finalize README/runbook/content replacement/backup checklist. | `README.md`, `08_DEPLOYMENT_RUNBOOK.md`. | 0.5 day | Owner can update content, redeploy and export/restore P1 data. |

Estimated P0 effort: approximately 5-9 developer days, excluding review delays. P1 is explicitly deferred.

## MVP acceptance checklist

- [ ] Public HTTPS URL opens on phone and desktop.
- [ ] Vietnamese names/date/address render correctly.
- [ ] Photos and fonts load and have documented rights.
- [ ] Share action and venue map open the intended destination.
- [ ] No unintended horizontal scroll or overlapping text at mobile widths.
- [ ] Reduced motion is respected and no audio autoplays.
- [ ] No secret, old PHP runtime, RSVP list, or demo credentials are published.
- [ ] Deployment does not depend on `D:\ThiepCuoi` or the owner's computer.
