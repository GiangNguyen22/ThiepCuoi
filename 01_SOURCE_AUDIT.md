# 01. Source Audit

Audit date: 2026-10-27  
Audited source: `D:\ThiepCuoi`  
New project: `D:\ThiepCuoiV2`

## Summary

The existing project is a customized CodeIgniter 3 wedding invitation application. Its README identifies CodeIgniter 3; `index.php` refers to CodeIgniter 3.1.9. It is designed to run locally through PHP's built-in server and to expose that server through a Cloudflare Tunnel. That is not independent cloud hosting: the owner's computer and tunnel process must remain available.

The local source contains widespread PHP wrappers that decrypt, decompress, and `eval` hidden code. The same pattern was checked in the upstream repository linked from the README, so there is no evidence here that the local checkout alone was modified. It does mean that important application behavior cannot be safely and independently reviewed from these source files. Do not execute or deploy this checkout as-is. This audit does not claim that the source is malware.

## Structure

```text
ThiepCuoi/
|-- index.php                 CodeIgniter front controller
|-- router.php                Local PHP server router
|-- run_window.bat            Windows launcher and Cloudflare Tunnel setup
|-- run_mac.sh                macOS/Linux launcher
|-- application/
|   |-- config/               Runtime configuration (some files obfuscated)
|   |-- controllers/          Public, auth, setup, CLI, admin routes
|   |-- models/               Content, users, invites, wishes, albums, photos
|   |-- views/                Admin and public invitation themes
|   |-- sql/                  Ordered SQLite schema migrations
|   `-- libraries/, helpers/  Application support code
|-- system/                   Bundled CodeIgniter framework
|-- assets/                   CSS, JavaScript, fonts, images, music
|-- database/                 Local database and session area; no DB found
|-- uploads/                  Local media upload area
`-- php/                      Bundled Windows PHP runtime and configuration
```

## Technology and dependencies

- Framework: CodeIgniter 3; the README also declares MIT licensing for CodeIgniter.
- PHP: bundled Windows runtime is described as PHP 8.2 in launcher comments. The executable was not run, so the exact build/version remains unverified.
- PHP extensions listed in `php/php.ini`: PDO SQLite, SQLite3, fileinfo, GD, mbstring, exif, zip, OpenSSL, cURL.
- Package manager: no Composer manifest was found in the visible project inventory. No Node package manifest was found.
- Browser libraries and third-party files were not fully audited. `assets/js/vendor` contains a QR-code script.

## Entry point and application organization

`index.php` defines environment and path constants before loading `system/core/CodeIgniter.php`. The project has conventional CodeIgniter controllers, models, views, configuration and routes, plus custom shell/batch launchers. The key routing, auth, database config, and application view files include encrypted/evaluated wrappers, so their effective implementation was not inspected or executed.

## Database and schema

The migrations establish **SQLite**, not MySQL:

- `001_init.sql`: `settings`, `users`, `albums`, `photos`, `wishes`, `rate_events`, and supporting indexes.
- `002_invites.sql`: invite records and RSVP status/guest count.
- `003_invite_cards.sql`: per-guest slugs, salutations, invitation text, maximum guests.
- `004_security.sql`: device-level rate limiting and session versioning.
- `005_guests_wishes.sql`: edited-wish timestamp and preserved old invite slugs.

No populated database or sample records were found under `database/`; the visible directory contained only a placeholder and sessions directory. Data volume and actual production configuration therefore remain unknown.

## Features described by project documentation

README describes an editable invitation, 10+ themes, individual guest links, RSVP, wishes, guest photo uploads, album moderation/passwords, admin statistics/export, QR/share flows, music/effects, lunar date/countdown, and six languages. These are documented claims, not independently verified runtime behavior.

## Reusable assets

- CSS themes and invitation/card styles under `assets/css/`.
- Local WOFF2 fonts with Vietnamese subsets, including Be Vietnam Pro, Cormorant Garamond, Charm, and others.
- SVG ornaments and theme preview images under `assets/img/`.
- More than ten MP3 files; `assets/music/CREDITS.txt` lists sources and licenses for the included tracks.
- `assets/js/vendor/qrcode.js` is present, but its license and code have not yet been reviewed.

The Vườn hoa, Song hỷ, and Provence previews show polished invitation layouts and Vietnamese typography. They are references, not permission to copy all associated photos. Check each image/font/library license and remove hidden or obfuscated scripts before any reuse. No asset was copied into V2 during the audit.

## Security and operations observations

- Many PHP files begin with obfuscated crypto/decompression logic and end in `eval`; this prevents ordinary review and is a blocker for safe deployment.
- Local config and filesystem behavior cannot be confirmed from the wrappers. Never copy secrets or runtime configuration from the old project.
- README displays public demo credentials `demo / demo2026`; treat them as publicly known, never reuse them.
- Local SQLite and uploaded media are stored on the owner machine. A tunnel URL is unavailable when the local app/computer is stopped.
- Upload validation, password handling, SQL safety, CSRF, XSS, rate limits, and admin authorization could not be verified in the hidden runtime code.
- No database backup, populated database, domain ownership, public deployment, or SLA was verified.

## Keep, rewrite, or exclude

- **Keep as references:** migration concepts, invitation sections, typography, theme previews, and individually reviewed static assets with clear licenses.
- **Rewrite:** application behavior, configuration, routing, data access, forms, auth, admin and upload logic. Implement only the approved P0 first.
- **Exclude:** encrypted/evaluated PHP/JS, local DB/session files, updater/tunnel launchers, public demo credentials, and unlicensed sample-couple photos.
- **Unverified:** exact PHP binary version, complete third-party licenses, media sizes, actual running behavior, database contents, and production secrets.

## Deployment assessment

The existing local-server-plus-tunnel setup can produce a shareable demo URL but depends on a running personal computer and local files. It does not meet the durable hosting goal. A clean static P0 on Cloudflare Pages is a simpler starting point; add a managed database only for the later RSVP phase. No source was run and no old-project file was modified during this audit.
