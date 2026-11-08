# AshoGhuri

Static bilingual Bangladesh travel guide and trip planner.

## Generate and validate

```sh
npm run generate
npm run validate
```

`site.config.json` is the canonical domain setting. The generator writes destination pages, sitemap, robots.txt, PWA metadata, and service worker into `dist/`.

## Deploy to Vercel

Import this repository or upload the source ZIP in Vercel. The included `vercel.json` runs `npm run generate` and publishes `dist/`; keep the project root at the repository root. The generated pages use the canonical origin in `site.config.json` (`https://ashoghuri.vercel.app`).

## Cost and image notes

Each destination page includes seven expense categories and explicit states: sourced estimate, quote to confirm, no public price, or not in this plan. A full route/date/group-specific trip total is not claimed without those details. Destination photos list the source, credit, and license; clearly labeled illustrations are used where no exact openly licensed photo was verified.

## Release checks

Run `npm run validate` after generation. The validator checks destination records, photos and their licenses, expense states, page metadata, sitemap, PWA assets, Content Security Policy image hosts, and local links. Review `RELEASE_READINESS.md` for the remaining live-service, price-verification, and real-device checks before a broad public campaign.
