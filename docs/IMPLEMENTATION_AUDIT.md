# ThiepCuoiV2 — Source and Technical Implementation Audit

Audit date: 2026-10-27  
Scope: static inspection and planning only. No application code was changed, no legacy PHP was executed, no service/account was created, and no deployment was performed.

## Executive Summary

`ThiepCuoiV2` is a small static site built with HTML, CSS and browser JavaScript. No server runtime, API, database, build tool, package manager or authentication configuration is present. The current platform choice, Cloudflare Pages, is consistent with the source as it exists; Pages Functions plus D1 are a reasonable next step for persisted RSVP/wishes and editable content, but not necessary for client-only album, music, share, or URL QR features.

Retain the current markup, CSS tokens, typography, images, responsive rules, and browser-native interactions. Add features in isolated sections and components rather than replacing the page. Implement every privileged read/write in backend Functions with server-side authorization. A frontend-only admin gate is not acceptable.

## Source Inventory

```text
ThiepCuoiV2/
|-- index.html                    Single Vietnamese invitation page and all current controls
|-- styles.css                    Theme, responsive layout, reveal and component styles
|-- app.js                        Countdown, sharing, toast and reveal behavior
|-- favicon.svg                   Small V&H mark
|-- images/
|   |-- cover.webp                Hero demo photo
|   |-- couple.webp               Gallery demo photo
|   |-- celebration.webp          Venue/gallery demo photo
|   |-- bouquet.webp              Gallery demo photo
|   `-- ATTRIBUTION.md            Image-source/license notes
|-- README.md                     Local preview, content edits, deployment status
|-- 01_SOURCE_AUDIT.md ...
|-- 08_DEPLOYMENT_RUNBOOK.md      Prior planning/audit documents
`-- docs/                         Requested audit report folder
```

The four WebP samples total about 0.8 MB. No `package.json`, lockfile, `node_modules`, Composer files, `.gitignore`, `wrangler.toml`/`wrangler.jsonc`, `_routes.json`, `functions/`, database migrations, test suite, music file, audio player, QR package or admin code was found in the V2 inventory. Google Fonts are requested at runtime; local fallback fonts are defined, but the font binaries are not bundled.

## Current Architecture

```text
Guest browser
  |-- index.html + styles.css + app.js + local WebP assets
  |-- Google Fonts stylesheet (external request)
  |-- Google Calendar link (external)
  `-- Google Maps search link (external)

No application backend, persistence, API or authentication exists in V2.
```

The site is presently served as ordinary static files. README gives a local preview command and says the public site has not been deployed. There is no configured Pages project or verified public `pages.dev` URL. P0 static hosting can therefore remain a build-free deploy.

## Existing UI and Actual Behavior

| Element | Current behavior | Data/backend status |
|---|---|---|
| Cover `Xem lời mời` | Anchor scroll to invitation section | Client-only; works |
| Top/footer `Chia sẻ` | Calls Web Share API; falls back to copying current URL and shows a toast | Client-only. Clipboard API requires a secure context except browser localhost treatment |
| Countdown | Counts down to 2026-11-28 00:00 at UTC+07:00, updates each minute | Client-only; no event/timezone configuration editor |
| `Thêm vào lịch` | Opens a static Google Calendar template for 28–29 November | External URL; all-day date range is encoded as Nov 28 to exclusive Nov 30 |
| `Xem bản đồ` | Opens a Google Maps query for TDP Ninh Sơn, Phường Vân Hà, TP Bắc Ninh | External URL; not a verified pin/coordinates |
| Hero / gallery images | Show local static WebP images; lazy-load below-fold media | No click/lightbox, upload or album data model |
| Reveal effects | IntersectionObserver adds a visible class; reduced-motion CSS is present | Client-only |
| Schedule | Displays two day labels and placeholder copy | Static content; no event times were supplied |
| Audio, RSVP, wishes, QR, admin, content editor, bank gift section | No corresponding controls or implementation in V2 | Not implemented |

No fake RSVP, database-backed data, admin login or transfer QR is currently present. The link/share QR is also absent.

## Legacy Project and QR Library Findings

The prior project at `D:\ThiepCuoi` is documented as CodeIgniter 3 with local SQLite and a PHP built-in server plus Cloudflare Tunnel. Its migrations describe users, albums, photos, wishes, rate limits and invitations/RSVP. Important PHP/config/controller files contain encrypted/decompressed `eval` wrappers; do not execute or copy that runtime. The schema may be used as a requirements reference only, not as evidence that its behavior is safe.

V2 contains no QR library. The old project has `D:\ThiepCuoi\assets\js\vendor\qrcode.js`. Its header identifies it as vendored `qrcode-generator@2.0.4`, MIT, global `qrcode` API. A static scan of that file found no `eval`, `new Function`, XHR, `fetch`, `innerHTML` or dynamic import patterns; that is not a full security audit, does not verify its provenance/integrity against the npm distribution, and does not guarantee output correctness. **Do not copy it yet.** Before reuse, compare its full contents/hash against the pinned upstream npm artifact, preserve the license, review its QR output interface, and run tests. Otherwise evaluate a maintained, pinned QR library after approval; do not add a dependency just for planning.

## Recommended Technical Direction

### Keep

- Plain HTML/CSS/JavaScript and the existing static Pages deployment model.
- Existing visual language, type choices, CSS variables, responsive breakpoints, semantic sections and image composition.
- Native Web Share/clipboard behavior and map/calendar links.
- Bundled approved images. Keep Google font fallback behavior and decide whether to self-host fonts after license/network review.
- No frontend framework, PHP rewrite, or build system unless a concrete requirement emerges.

### Add

- Pages Functions under `functions/api/...` for all database reads/writes and admin authorization.
- D1 binding and versioned SQL migrations for content, RSVP/wishes, optional gift settings, sessions and rate-limits.
- `_routes.json` so static assets stay static and only API/admin routes invoke Functions. Cloudflare's Pages routing documentation warns that adding Functions can cause all routes to invoke Functions by default unless invocation routes are constrained.
- A small admin interface that matches existing styles, with backend authorization on every protected endpoint. It may be a static HTML shell, but data and mutations must remain inaccessible without server-verified authorization.

### Alternatives

1. **Pages + Pages Functions + D1 (preferred):** fewest new operating parts for this static V2, same-origin API, managed SQLite-compatible persistence, and free quotas appropriate for a small invitation. D1 is not an unlimited production guarantee; requests/writes can fail on quota exhaustion. The current official Free Time Travel window is seven days on a production-backend database; retain private exports too.
2. **Pages + external Supabase/Neon/Postgres:** technically possible but adds cross-provider credentials, latency, account/billing policy and connection/API integration. Choose only for a specific PostgreSQL/auth feature not met by D1.
3. **PHP/MySQL hosting:** not recommended for V2. It would add/reintroduce a server stack absent from the source and still would not make the legacy obfuscated runtime safe. Consider only if there is a concrete PHP dependency or hosting requirement.

Cloudflare documentation consulted: [Pages Functions](https://developers.cloudflare.com/pages/functions/), [routing](https://developers.cloudflare.com/pages/functions/routing/), [bindings](https://developers.cloudflare.com/pages/functions/bindings/), [D1 binding API](https://developers.cloudflare.com/d1/worker-api/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), and [Cloudflare Access account limits](https://developers.cloudflare.com/cloudflare-one/account-limits/). Provider terms and limits must be rechecked before deployment.

## Proposed API Surface

Keep API responses JSON, no stack traces/secrets, bounded payload sizes, explicit content types and stable status codes. Use same-origin requests. Public endpoints return allow-listed fields only; no endpoint returns the full RSVP list publicly.

| Method and route | Access | Purpose |
|---|---|---|
| `GET /api/public/invitation` | Public | Published names, dates, venue, schedule, gallery metadata and enabled public gift details |
| `POST /api/rsvps` | Public, validated/rate-limited | Create or update an RSVP according to a future duplicate-response policy |
| `POST /api/wishes` | Public, validated/rate-limited | Submit a wish as pending moderation |
| `GET /api/public/wishes` | Public, optional P2 | Return approved, paginated wishes only; defer until requested |
| `POST /api/admin/session` | Public login endpoint, throttled | Verify admin credential and create a server-verifiable session |
| `GET /api/admin/session` | Admin | Confirm current session for admin UI |
| `DELETE /api/admin/session` | Admin + CSRF | Revoke/log out the session |
| `PUT /api/admin/invitation` | Admin + CSRF | Validate and update the single invitation content record |
| `GET /api/admin/rsvps` | Admin | Paginated RSVP export/list |
| `GET /api/admin/wishes` | Admin | Paginated moderation queue |
| `PATCH /api/admin/wishes/{id}` | Admin + CSRF | Approve/hide a wish |
| `PUT /api/admin/gift-settings` | Admin + CSRF | Change/disable explicitly public transfer information |

Expected cases: `201` create, `200` read/update, `400/422` invalid input, `401` unauthenticated, `403` forbidden/CSRF/origin failure, `404` missing record, `409` duplicate/conflicting response if the chosen policy requires it, `429` rate limit, and generic `500` without internal details. Avoid public admin search/export endpoints.

## Proposed D1 Schema (subject to Task 1 confirmation)

This is a one-invitation schema. Do not add a multi-wedding/tenant abstraction unless requested.

| Table | Proposed fields and constraints | Purpose/security |
|---|---|---|
| `invitation_content` | `id INTEGER PRIMARY KEY CHECK(id=1)`, names, date start/end, lunar label, greeting, venue name/address/map URL, validated `schedule_json`, validated `gallery_json`, `updated_at` | Single editable invitation. Public endpoint projects only known fields. Validate JSON shape, URL schemes, lengths and entry counts before writing. |
| `rsvps` | `id INTEGER PRIMARY KEY`, `guest_name TEXT`, `attendance TEXT CHECK(...)`, `party_count INTEGER CHECK(...)`, optional `created_at/updated_at` | Minimize PII; no phone/address by default. Decide how guests revise/duplicate responses before schema lock. |
| `wishes` | `id INTEGER PRIMARY KEY`, `guest_name TEXT`, `message TEXT`, `status TEXT CHECK(status IN ('pending','approved','hidden'))`, `created_at` | Keep pending by default; HTML-escape on render; public reads return approved rows only. |
| `gift_settings` | singleton ID, enabled flag, bank/BIN, account number/name, optional transfer note/amount | Account information is intentionally public only after explicit owner opt-in. Never store bank login, PIN, password or card secrets. Public API returns it only when enabled. |
| `admin_sessions` | `token_hash TEXT PRIMARY KEY`, `created_at`, `expires_at`, `revoked_at` | Store only hash of a random session token; server verifies/revokes. Index expiry for cleanup. |
| `rate_limit_events` | action, keyed/HMACed client fingerprint, timestamp | Bound login/RSVP/wish attempts; minimize retention and periodically prune. Do not store raw IPs unless separately justified. |

Use SQLite strict/check constraints where supported, foreign keys only where a real relationship is needed, and indexes for actual admin pagination (e.g. `(status, created_at, id)`). Add schema migrations and test them locally before binding production D1. `admin_users` is intentionally omitted for a single owner: use a provisioned password hash/secret outside Git, and add an admin-user table only if multi-user management becomes a requirement.

## Admin Authentication Proposal

Do not treat an obscure `/admin` URL, hidden button, client-side password, or localStorage token as protection. Every `api/admin/*` request must verify authentication at the Function boundary.

For one owner and a Pages subdomain, proposed baseline is an environment secret holding a pre-hashed admin password, a high-entropy signing secret, and random server-side sessions whose hashes/expiry are stored in D1. Set cookies `Secure`, `HttpOnly`, `SameSite=Strict` (or justify Lax), short expiry and path scope; implement logout/revocation, CSRF/origin protection for state changes, generic login errors and throttling. Use a reviewed password-hash scheme supported in the runtime and a constant-time verification path. Store secrets only in Cloudflare encrypted secrets and ignored local dev vars, never in JS/config/Git. Do not put bank account or admin credential in static HTML.

Cloudflare Access can be an additional gate, but current Access docs for self-hosted public hostnames require an active domain in the Cloudflare zone; do not assume it protects the provider-owned `pages.dev` hostname without verifying the exact supported setup. If a custom domain becomes available, Access may be evaluated as an extra layer, not a substitute for backend checks.

## Feature Mapping Without Breaking the Current Design

| Feature | Proposed implementation | UI constraints |
|---|---|---|
| Interactive album | Make existing figures buttons/keyboard targets; open a native `<dialog>` or accessible lightbox, with close/Escape, previous/next, alt/caption, focus handling and mobile swipe only if tested | Keep grid and image sizes; dialog overlays rather than reflowing page; respect reduced motion |
| Background music | Add visible play/pause button and user-initiated `<audio>`; never autoplay; bundle only a track whose source/license/credit are verified | Use existing button tokens; loading/error states; no audio fetch before opt-in |
| Share | Keep existing native Web Share + clipboard fallback | Already implemented; test on HTTPS/mobile and denied clipboard |
| URL QR | Generate locally from canonical public URL after public deployment URL is known; no database needed | Hide/disable while URL is localhost; provide download/accessible link; test scan on multiple devices |
| RSVP | POST to Functions; persist in D1; server validates schema, size, allowed values and duplicate policy | Add form states without changing page bands/type/color tokens |
| Wishes | POST to Functions; pending moderation; only approved text optionally public | Escape text; add success/error/empty states, preserve typography |
| Admin | Small styled screen; Functions authorize every request; list/moderate RSVP/wishes; export server-authorized CSV if approved | Login/access states; never render private records in public markup |
| Edit invitation | Admin form updates allow-listed `invitation_content`; preview and publish confirmation; version/back-up before update | Keep content lengths/layout constraints; prevent HTML injection and arbitrary CSS/URLs |
| Bank transfer QR | Use validated bank/BIN/account data and a locally generated, standards-compliant VietQR payload after owner supplies/approves details; show account text/copy separately | Off by default; explicit consent because details become public; show preview/test before publishing; never send account data to an unapproved third-party QR API |

For the transfer QR, do not claim a QR library alone implements VietQR. The payload must comply with the applicable EMV/VietQR specification and CRC, and be validated against supported banking apps. The existing legacy QR library only generates QR symbols from text; it does not by itself assemble or validate bank-transfer payloads.

## Security, Privacy, and Operations Risks

- **Legacy code:** PHP/config/controller files in `D:\ThiepCuoi` have obfuscated decrypt/decompress/eval wrappers; no execution or copy. Existing legacy QR library is only a candidate, not trusted by self-asserted header.
- **XSS/SQL injection:** bind SQL params; treat all admin and guest text as untrusted; encode for HTML context; prohibit arbitrary HTML, script, style and untrusted image URLs.
- **CSRF/session theft:** Secure/HttpOnly/SameSite cookies, CSRF token or strict origin validation, expiration, logout/revoke and session rotation after login.
- **Auth:** hash admin credential outside source, rate limit login, no public record listing; verify authorization in every Function; return generic errors.
- **Spam/abuse:** server limits on text/counts, honeypot or approved challenge, per-action rate limits and pruning. Do not trust browser validation.
- **PII:** collect only guest name, attendance, party count, optional wish; avoid phone/IP unless necessary; document retention/deletion.
- **Bank data:** account number/name are sensitive until intentionally published. Admin preview and disabled-by-default gift flag; verify all digits and recipient before enabling; no secrets/credentials.
- **File uploads:** not needed for current album (static display). If guest uploads are later requested, require separate threat model, MIME/content validation, size/rate quotas, malware/image re-encode, private moderation and R2 lifecycle rules.
- **Free tier:** D1/Functions limits can reject requests or writes; D1 Free Time Travel is 7 days and restores destructively; keep private SQL exports and rehearse restore. Do not promise SLA.
- **External services:** current Google Fonts, Calendar and Maps are third-party requests/links. Fonts have fallbacks; verify phone/browser behavior and privacy policy if analytics or extra trackers are added.
- **Payments:** QR only initiates a bank transfer; no payment confirmation or reconciliation is implied.

## Ordered Tasks and Acceptance Criteria

| Order | Task/dependency | Work | Acceptance/testing |
|---:|---|---|---|
| 0 | This audit | Confirm current source, decisions and unknowns. | Owner reviews this report. No code change/deploy in Task 0. |
| 1 | Platform/data/security decisions | Approve Pages Functions + D1, account/domain/admin-auth model, RSVP duplicate policy, wish visibility, which admin fields are editable, and bank-info publication. No secret/account setup without owner action. | Written decisions; no unresolved production auth boundary. |
| 2 | Data contract + local Function skeleton | Add `wrangler.jsonc`, `functions/`, `_routes.json`, D1 migrations and local dev setup; static requests excluded from Functions routes. | `wrangler pages dev` static assets remain served; route tests; no Cloudflare resources created by local tests. |
| 3 | Public content/RSVP/wishes API | Public allow-list GET; validated POSTs; prepared SQL; constraints, rate limit and generic errors. | Unit/integration tests for valid, malformed, oversized, duplicate, spam and XSS payloads; records persist across local restart/redeploy simulation. |
| 4 | Admin auth + content editor | Secret provisioning runbook; login/logout/session/CSRF/rate-limit; invitation and gift-setting writes; admin screens. | Anonymous direct API requests return 401/403; forged/expired/CSRF requests fail; successful edits persist; no secrets or records in page source. |
| 5 | Wishes/RSVP moderation | Admin list, approve/hide, private export if approved. | Public endpoint returns approved wishes only; unapproved entries never leak; authorized export only. |
| 6 | Interactive album + audio | Lightbox using existing markup; approved licensed music with explicit playback control. | Keyboard/Escape/mobile focus checks; reduced motion; no autoplay; no console errors and current layout unchanged outside overlay/control. |
| 7 | Public QR and bank QR | Reuse QR implementation only after provenance/license review; URL QR after hostname approval; VietQR after owner supplies verified bank details. | Scan canonical HTTPS URL; scan transfer payload with at least two banking apps; account/recipient match; no third-party data disclosure without approval. |
| 8 | Full QA and handover | Desktop/mobile, accessibility, abuse/security, quota, export/restore, content update and rollback. | Acceptance checklist passes; owner verifies manual update/restore; only then separately approve deployment. |

## Decisions Required Before Task 1

1. Confirm Pages Functions + D1 as the backend, or request another platform.
2. Confirm RSVP can be public form and decide if repeat responses should replace prior response, be rejected, or use invitation tokens.
3. Decide whether approved wishes should be public or admin-only.
4. Identify which content fields the admin should edit and who holds the one admin credential.
5. Decide whether the bank name, account number, account holder and transfer note should be publicly displayed; provide these details only through a private channel at a later approved task.
6. Confirm a public Pages hostname is sufficient for the URL QR, or plan a custom domain later. Current `localhost` QR is not useful to guests.

## Audit Result

The least disruptive path is to preserve the static page and implement server-only features incrementally with Pages Functions + D1. Current V2 has no QR library to reuse; a legacy MIT-declared candidate exists in the old project but requires full provenance/license/integrity review before copying. No implementation, deployment or third-party account change is part of this audit.
