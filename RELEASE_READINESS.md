# AshoGhuri release readiness review

Review date: 8 November 2026

## Checked in this build

- 175 bilingual destination records with descriptions, route guidance, seasonal guidance, suggested stops, and an official or reference source URL.
- 175 destination photo records. 163 use curated photo matches with source page, credit, and license; 12 visibly use an illustrated fallback because a representative licensed photo was not verified.
- Seven expense categories per destination, each with an explicit state and English/Bangla explanation. A route/date/group-specific total remains explicitly unavailable unless its inputs are verified.
- Generated destination pages, titles, descriptions, canonicals, social metadata, sitemap, robots rules, PWA assets, and local links.
- Static accessibility checks for duplicate IDs, explicit or implicit form labels, named buttons and links, and image alternative handling.
- Desktop/mobile CSS safeguards, visible keyboard focus styling, reduced-motion rules, and local navigation paths.

## Results from this source audit

- The data contains 44 destination-specific sourced cost records. Across 1,225 expense categories, 512 are `known_estimate`, 91 `needs_quote`, 361 `not_priced`, and 261 `not_applicable`. These category counts are not complete trip totals.
- Online account sign-in, cross-device sync, public tour memories, and companion matching are not active backend features. The current profile, saved trips, and memories remain on the user’s device.
- External source pages and third-party image links were not exhaustively live-checked in this build review.
- An actual mobile-device and assistive-technology review remains necessary. The browser automation service was unavailable during this review, so visual browser screenshots and runtime interaction checks could not be completed.

## Before broad paid promotion

1. Continue replacing fallback illustrations only when a real place-matched image and its reuse rights are verified.
2. Expand dated source-backed route, admission, boat, activity, and lodging price records. Keep unknown charges clearly marked and do not advertise category estimates as a complete trip price.
3. Run keyboard and screen-reader checks on the deployed site, including the mobile menu, photo gallery, planner, memory preview, account form, and errors/empty states.
4. Test on current Android and iOS phones, slow network, dark/light switching, and reduced-motion settings; verify third-party weather and image providers in production.
5. If enabling accounts, public memories, or companion matching, add authentication, consent, moderation, abuse handling, and privacy controls before collecting or publishing user data.
