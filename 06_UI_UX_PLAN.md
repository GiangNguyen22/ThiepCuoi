# 06. UI/UX Plan

## Sitemap

```text
/
|-- Cover / couple names / wedding date
|-- Invitation message
|-- Wedding date and countdown
|-- Schedule
|-- Venue and map link
|-- Photo gallery
`-- Share / closing message
```

P0 contains one public invitation page. No admin, guest list or RSVP route.

## Design direction

Romantic editorial invitation with deep botanical green, muted rose, a pale blush background, and dark ink text. Use Cormorant Garamond for display typography and Be Vietnam Pro for body text (Google Fonts, with local serif/sans fallbacks). Avoid oversized controls and nested cards; use full-width section bands, fine rules and generous whitespace. Keep the first viewport centered on the couple's names over a real wedding photo. The locally bundled Unsplash hero is sample content only; replace it with an approved couple photo before launch.

## Sections

1. Full-screen photo cover with names, date, and an in-page "Xem lời mời" action.
2. Invitation note, written as a personal message.
3. Date and a small countdown; never block access if JavaScript is unavailable.
4. Schedule with time and concise event labels.
5. Venue address, map action and optional directions.
6. Three-photo gallery with alt text and responsive crops.
7. Closing message and share-link action.

## Interaction and accessibility

- Share through `navigator.share`; fall back to clipboard and show a success/failure status.
- Respect `prefers-reduced-motion`; do not autoplay audio.
- Use semantic landmarks/headings, visible keyboard focus, 44px minimum touch targets, alt text and sufficient color contrast.
- Countdown is supplementary, uses local Vietnam time, and degrades to the static date.
- Provide clear image alt text; sample photos are bundled locally to avoid third-party image request failures.
- Ensure text reflows at narrow mobile widths without horizontal scrolling.

## Assets

- Current reference source: reviewed theme previews in `D:\ThiepCuoi\assets\img\theme-previews` and local Vietnamese font inventory in `D:\ThiepCuoi\assets\fonts`; not copied because license review is still required.
- Optimized WebP sample photos are bundled under `images/`; source links and license notes are in `images/ATTRIBUTION.md`. Replace with user-provided or otherwise licensed optimized images before public invitation.
- CSS contains no proprietary source imagery. Avoid copying demo-couple photos.

## Screens/states

P0: initial cover, scrolled invitation sections, share success/fallback, reduced-motion, narrow viewport and image-load failure. P1 later adds form idle/validation/submitting/success/server-error states; they are not implemented now.
