# 02. Product Scope

## Product goal

A Vietnamese-first, mobile-friendly wedding invitation that opens from a stable public link, displays the event and venue information, and can be shared with guests. P0 deliberately avoids accounts, uploads, and a database.

## P0: release scope

- Invitation cover with couple names and wedding date.
- Invitation message and event details.
- Schedule/timeline.
- Venue and map link.
- Responsive gallery using approved, optimized images.
- Share link using Web Share API with clipboard fallback.
- Vietnamese content and typography.
- HTTPS public URL from the chosen hosting provider.
- README instructions for local preview and editing event content.

**Acceptance:** opens over HTTPS on phone and desktop; names/date/address are correct; all images/fonts load; no unwanted horizontal scrolling; map and share controls work; content remains legible with reduced-motion settings; no local drive path or personal-computer runtime dependency.

## P1: guest interaction, after P0 approval

- RSVP: attending/not attending and party size if needed.
- Optional guest wish.
- Server-side validation, parameterized DB operations, spam controls and clear success/failure states.
- Persist data in a managed database, never on an ephemeral application filesystem.
- Do not expose RSVP records or guest lists publicly.

## P2: defer

Admin authentication/content editor, photo uploads and album management, RSVP analytics/export, multiple themes per invitation, custom invitation URLs, QR code, and richer animation/audio controls. These are not launch requirements. Do not add a login/admin surface until its operational value and security responsibilities are approved.

## Explicit non-goals for P0

No RSVP, database, admin, user accounts, photo upload, payment, purchased domain, autoplay music, or claim that the public deployment is already live.

## Content to replace before public sharing

The current page contains demonstration names, date, location and sample photography. Replace every sample value and image with couple-approved content before inviting real guests. Verify image usage rights and destination links.
