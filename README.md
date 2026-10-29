# AshoGhuri

Static bilingual Bangladesh travel guide and trip planner.

## Generate and validate

```sh
npm run generate
npm run validate
```

`site.config.json` is the canonical domain setting. The generator writes destination pages, sitemap, robots.txt, PWA metadata, and service worker into `dist/`.

## Deploy to Vercel

Import this repository or upload the source ZIP in Vercel. Keep the output directory set to `dist`. There is no build step required for serving the generated static site; run the two commands above whenever source data changes.

## Cost and image notes

Each destination page includes seven expense categories and explicit states: sourced estimate, quote to confirm, no public price, or not in this plan. A full route/date/group-specific trip total is not claimed without those details. Destination photos list the source, credit, and license; clearly labeled illustrations are used where no exact openly licensed photo was verified.
