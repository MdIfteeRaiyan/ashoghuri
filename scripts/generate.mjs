import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8'));
const siteUrl = new URL(config.siteUrl);
if (siteUrl.protocol !== 'https:' || siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash) {
  throw new Error('siteUrl must be an HTTPS origin, e.g. https://ashoghuri.vercel.app');
}
const origin = siteUrl.origin;
const out = path.join(root, config.staticDirectory || 'dist');
const dataWindow = {};
const dataContext = vm.createContext({ window: dataWindow });
for (const file of [
  'place-db.js', 'place-db-batch.js', 'place-db-country-completion.js',
  'place-image-db.js', 'place-cost-db.js', 'place-budget-references.js', 'place-expense-distributions.js'
]) {
  vm.runInContext(await readFile(path.join(out, file), 'utf8'), dataContext, { filename: file, timeout: 5000 });
}
const places = Array.from(dataWindow.AshoGhuriPlaceDB || []);
const photos = dataWindow.AshoGhuriPlaceImageDB || {};
const costs = dataWindow.AshoGhuriPlaceCostDB || {};
const expensePlans = dataWindow.AshoGhuriPlaceExpensePlanDB || {};
if (!places.length) throw new Error('Place database is empty');

const appMeta = {
  'index.html': ['AshoGhuri — Bangladesh trip planner', 'Plan thoughtful trips across Bangladesh with destination guides, route planning, transparent cost states, safety notes and practical travel details.'],
  'planner.html': ['Plan a trip — AshoGhuri', 'Build a Bangladesh trip plan around your starting point, available time, interests and budget. Check transport fares for your route and date before departure.'],
  'places.html': ['Explore Bangladesh places — AshoGhuri', 'Search 175 Bangladesh destination guides by place, district or division, from historic landmarks to nature, rivers, hills and local escapes.'],
  'community.html': ['Travel together — AshoGhuri', 'See the current AshoGhuri travel-together roadmap, account readiness and privacy limits before looking for a tour partner.'],
  'memories.html': ['Tour memories — AshoGhuri', 'Create a private tour-memory card with your story and photo. Preview and share it from your device; public posting is not enabled.'],
  'safety.html': ['Travel safety and weather — AshoGhuri', 'Review Bangladesh travel safety reminders, approximate nearby weather and official emergency contacts before departure.'],
  'how.html': ['How AshoGhuri works', 'Learn how AshoGhuri destination guides, route planning, fare references, cost states and safety information work.'],
  'fares.html': ['Fares and cost references — AshoGhuri', 'Understand sourced ticket components, official fare references and the limits of manual route quotes in AshoGhuri trip estimates.'],
  'saved.html': ['Saved trips — AshoGhuri', 'View trips and places saved in this browser on this device. Saved data does not sync to an online account.'],
  'account.html': ['Travel profile — AshoGhuri', 'Manage a local travel profile stored in this browser. AshoGhuri does not yet provide online sign-in or cross-device sync.'],
  'privacy.html': ['Privacy and your data — AshoGhuri', 'Learn what AshoGhuri stores in your browser, what is not uploaded and how to clear local data.']
};
const routeH1 = {
  'planner.html': ['Plan a trip across Bangladesh', 'বাংলাদেশে ভ্রমণের পরিকল্পনা করুন'],
  'places.html': ['Explore places across Bangladesh', 'বাংলাদেশের ভ্রমণ গন্তব্য ঘুরে দেখুন'],
  'community.html': ['Travel together', 'একসঙ্গে ভ্রমণ'],
  'memories.html': ['Tour memories', 'ভ্রমণের স্মৃতি'],
  'safety.html': ['Travel safety and weather', 'ভ্রমণ নিরাপত্তা ও আবহাওয়া'],
  'how.html': ['How AshoGhuri works', 'আশোঘুরি যেভাবে কাজ করে'],
  'fares.html': ['Fares and trip costs', 'ভাড়া ও ভ্রমণ খরচ'],
  'saved.html': ['Saved trips', 'সংরক্ষিত ভ্রমণ']
};

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const safeUrl = value => {
  try { const url = new URL(String(value || '')); return url.protocol === 'https:' ? url.href : ''; }
  catch { return ''; }
};
const split = value => String(value || '').split(/[·|]/).map(s => s.trim()).filter(Boolean);
const langs = (en, bn, cls='') => `<span class="${cls}" lang="en">${esc(en)}</span><span class="${cls}" lang="bn">${esc(bn)}</span>`;
const publicFiles = new Set(['index.html','planner.html','places.html','community.html','memories.html','safety.html','how.html','fares.html','privacy.html']);
const pageTitles = Object.fromEntries(Object.entries(appMeta).map(([name, m]) => [name, m[0]]));

function normalizeAppPage(name, html) {
  const [title, description] = appMeta[name];
  const canonicalPath = name === 'index.html' ? '/' : `/${name}`;
  const canonical = `${origin}${canonicalPath}`;
  const noindex = ['account.html','saved.html'].includes(name);
  const robots = noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">';
  const og = `\n  <meta property="og:type" content="website">\n  <meta property="og:site_name" content="AshoGhuri">\n  <meta property="og:title" content="${esc(title)}">\n  <meta property="og:description" content="${esc(description)}">\n  <meta property="og:url" content="${esc(canonical)}">\n  <meta property="og:image" content="${origin}/assets/og-ashoghuri.jpg">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">\n  <meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:title" content="${esc(title)}">\n  <meta name="twitter:description" content="${esc(description)}">\n  <meta name="twitter:image" content="${origin}/assets/og-ashoghuri.jpg">`;
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`)
    .replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${esc(description)}">`)
    .replace(/<link\s+rel=["']canonical["'][^>]*>/ig, '')
    .replace(/<link\s+rel=["']manifest["'][^>]*>/ig, '')
    .replace(/<link\s+rel=["'](?:icon|apple-touch-icon)["'][^>]*>/ig, '')
    .replace(/<link\s+rel=["']stylesheet["'][^>]*href=["']\/site-extras\.css["'][^>]*>/ig, '')
    .replace(/<meta\s+(?:property|name)=["'](?:og:[^"']+|twitter:[^"']+|robots)["'][^>]*>/ig, '');
  html = html.replace(/<\/head>/i, `  <link rel="canonical" href="${esc(canonical)}">\n  ${robots}${og}\n  <link rel="manifest" href="/manifest.webmanifest">\n  <link rel="icon" type="image/svg+xml" href="/asho-ghuri-mark.svg">\n  <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">\n  <link rel="apple-touch-icon" href="/icons/icon-192.png">\n  <link rel="stylesheet" href="/site-extras.css">\n</head>`);
  if (!html.includes('class="skip-link"')) html = html.replace(/<body([^>]*)>/i, (_m, attrs) => `<body${attrs}>\n<a class="skip-link" href="#main-content">Skip to main content</a>`);
  html = html.replace(/<main([^>]*)>/i, (_m, attrs) => {
    const next = /\bid=/.test(attrs) ? attrs.replace(/\bid=["'][^"']*["']/, 'id="main-content"') : `${attrs} id="main-content"`;
    return `<main${next}>`;
  });
  if (routeH1[name] && !html.includes('class="page-seo-heading"')) {
    const [en, bn] = routeH1[name];
    const heading = `<header class="page-seo-heading"><p class="page-kicker">ASHOGHURI · ${esc(pageTitles[name])}</p><h1>${langs(en,bn)}</h1></header>`;
    html = html.replace(/<main[^>]*>/i, match => `${match}\n${heading}`);
  }
  if (name === 'places.html' && !html.includes('static-destination-directory-link')) {
    html = html.replace(/<header class="page-seo-heading">[\s\S]*?<\/header>/i, match => `${match}<section class="static-destination-directory-link"><div><strong>Browse all 175 destination guides</strong><span>সব ১৭৫টি গন্তব্যের বিস্তারিত গাইড দেখুন</span></div><a href="/destinations/">Open destination directory →</a></section>`);
  }
  html = html.replace(/<video\b([^>]*)>/i, (_m, attrs) => {
    const safeAttrs = attrs.replace(/\sautoplay(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/i, '').replace(/\spreload\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, '');
    return `<video${safeAttrs} preload="none">`;
  });
  if (!html.includes('src="/site-runtime.js"')) html = html.replace(/<\/body>/i, `  <script src="/site-runtime.js" defer></script>\n</body>`);
  return html.replace(/Md\.Iftee Raiyan/g,'Md. Iftee Raiyan');
}

async function normalize404() {
  const file=path.join(out,'404.html');
  let html=await readFile(file,'utf8');
  html=html.replace('href="asho-ghuri-mark.svg?v=3"','href="/asho-ghuri-mark.svg"');
  html=html.replace('src="asho-ghuri-mark.svg?v=3"','src="/asho-ghuri-mark.svg"');
  if(!html.includes('max-width:100%;overflow-x:hidden'))html=html.replace(/<style>/i,'<style>*{box-sizing:border-box}html,body{max-width:100%;overflow-x:hidden}body{overflow-wrap:anywhere}.card{max-width:100%;padding:clamp(20px,6vw,36px)}');
  html=html.replace(/<link\s+rel=["']icon["'][^>]*icon-192\.png[^>]*>/ig,'').replace(/<link\s+rel=["']stylesheet["'][^>]*site-extras\.css[^>]*>/ig,'');
  html=html.replace(/<\/head>/i,'<link rel="icon" type="image/svg+xml" href="/asho-ghuri-mark.svg"><link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png"><link rel="stylesheet" href="/site-extras.css"></head>');
  if(!html.includes('class="skip-link"'))html=html.replace(/<body([^>]*)>/i,'<body$1><a class="skip-link" href="#main-content">Skip to main content</a>');
  html=html.replace(/<main([^>]*)>/i,(_m,attrs)=>`<main${/\bid=/.test(attrs)?attrs.replace(/\bid=["'][^"']*["']/,'id="main-content"'):`${attrs} id="main-content"`}>`);
  html=html.replace(/href="index\.html"/g,'href="/"').replace(/href="places\.html"/g,'href="/places.html"').replace(/href="planner\.html"/g,'href="/planner.html"');
  await writeFile(file,html.replace(/Md\.Iftee Raiyan/g,'Md. Iftee Raiyan'));
}

function photoGallery(place) {
  const image = photos[place.id] || {};
  const list = Array.isArray(image.photos) ? image.photos : [];
  const usable = list.filter(p => safeUrl(p.thumbnail || p.url));
  if (!usable.length) {
    const fallback = image.fallbackImage && image.fallbackImage.startsWith('/assets/place-fallbacks/') ? image.fallbackImage : '/assets/place-fallbacks/landscape.svg';
    return `<figure class="fallback-photo"><img src="${esc(fallback)}" alt="" width="1200" height="720"><figcaption><strong>Illustration · not a verified photograph</strong><small lang="bn">চিত্র · যাচাইকৃত স্থানের আসল ছবি নয়</small>${image.fallbackReason ? `<small>${esc(image.fallbackReason)}</small>` : ''}</figcaption></figure>`;
  }
  return `<div class="photo-grid">${usable.slice(0,6).map((photo,i) => {
    const src = safeUrl(photo.thumbnail || photo.url);
    const page = safeUrl(photo.page || photo.sourceUrl);
    const alt = `${place.name}${photo.title ? ` — ${photo.title}` : ''}`;
    return `<figure><a href="${page || src}" target="_blank" rel="noopener noreferrer"><img src="${src}" alt="${esc(alt)}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} onerror="this.closest('figure').classList.add('image-unavailable')"><span class="image-error">Photo temporarily unavailable</span></a><figcaption>${esc(photo.author || 'Photo credit unavailable')} · ${esc(photo.license || 'Check source license')} <a href="${page || src}" target="_blank" rel="noopener noreferrer">Source ↗</a></figcaption></figure>`;
  }).join('')}</div>`;
}

function expensePanel(place) {
  const plan = expensePlans[place.id];
  const record = costs[place.id] || {};
  if (!plan || !Array.isArray(plan.items)) return `<section class="detail-panel"><h2>${langs('Cost information','খরচের তথ্য')}</h2><p class="price-state">${langs('Cost review required','খরচ যাচাই প্রয়োজন')}</p><p class="cost-empty">${langs('No expense breakdown is available. Confirm every component with the venue and transport operator before budgeting.','খরচের বিভাজন পাওয়া যায়নি। বাজেট করার আগে স্থান ও পরিবহন অপারেটরের কাছে প্রতিটি খরচ নিশ্চিত করুন।')}</p></section>`;
  const stateStyle = {known_estimate:'known',needs_quote:'quote',not_priced:'unpriced',not_applicable:'na'};
  const items = `<ul class="cost-items">${plan.items.map(item => {
    const amount = item.amount ? `<strong>${esc(item.amount)}</strong>` : `<strong class="expense-state expense-${stateStyle[item.state] || 'unpriced'}">${langs(item.stateLabel || 'Confirm price',item.bnStateLabel || 'দর নিশ্চিত করুন')}</strong>`;
    const label = `${langs(item.label,item.bnLabel)}${amount}`;
    return `<li class="expense-line expense-${stateStyle[item.state] || 'unpriced'}"><span class="expense-line-title">${label}</span><small>${langs(item.note,item.bnNote)}</small>${item.source ? `<small class="expense-source-label">${langs('Source','সূত্র')}: ${esc(item.source)}</small>` : ''}</li>`;
  }).join('')}</ul>`;
  const ref = plan.planningReference ? `<aside class="budget-reference"><strong>${langs('Published planning reference (not a complete trip cost)','প্রকাশিত পরিকল্পনা-সূত্র (পূর্ণ ভ্রমণ-খরচ নয়)')}</strong><p>${langs(plan.planningReference.value,plan.planningReference.bnValue)}</p><small>${langs(plan.planningReference.scope,plan.planningReference.bnScope)}</small>${safeUrl(plan.planningReference.sourceUrl) ? `<a href="${safeUrl(plan.planningReference.sourceUrl)}" target="_blank" rel="noopener noreferrer">${langs('Open estimate source ↗','অনুমানের সূত্র দেখুন ↗')}</a>` : ''}</aside>` : '';
  const sourceDetails = (plan.sources || []).map(s => safeUrl(s.url) ? `<li><a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a></li>` : '').join('');
  const sourceDisclosure = sourceDetails ? `<details class="expense-sources"><summary>${langs('View fare and cost sources','ভাড়া ও খরচের সূত্র দেখুন')}</summary><ul>${sourceDetails}</ul></details>` : '';
  const isClosed = /andharmanik/i.test(place.id);
  return `<section class="detail-panel expense-panel"><h2>${langs('Trip expense checklist','ভ্রমণ-খরচের তালিকা')}</h2><p class="price-state incomplete-state">${langs('Full trip total unavailable · confirm route and date','পূর্ণ ভ্রমণ-খরচ নেই · রুট ও তারিখ নিশ্চিত করুন')}</p><p class="expense-summary">${langs(`${plan.tripTotal.knownLineCount} sourced estimate(s) · ${plan.tripTotal.needsQuoteLineCount} quote(s) to confirm · ${plan.tripTotal.notPricedLineCount} without a public price${isClosed ? ' · access currently restricted' : ''}`,`${plan.tripTotal.knownLineCount}টি সূত্রসহ অনুমান · ${plan.tripTotal.needsQuoteLineCount}টি কোট নিশ্চিত করতে হবে · ${plan.tripTotal.notPricedLineCount}টির প্রকাশিত দর নেই${isClosed ? ' · প্রবেশ বর্তমানে সীমিত' : ''}`)}</p>${items}${ref}<p class="trip-cost-note">${langs('No complete origin, date, group-size and service-specific total is verified. Blank or unknown prices are never treated as ৳0. Get dated quotes for all “quote to confirm” and “no public price” items.','শুরুর স্থান, তারিখ, দলের আকার ও সেবাভেদে পূর্ণ মোট খরচ যাচাই করা নেই। ফাঁকা বা অজানা দামকে ৳০ ধরা হয়নি। “কোট নিশ্চিত করুন” ও “প্রকাশিত দর নেই” খরচের জন্য তারিখসহ কোট নিন।')}</p>${sourceDisclosure}</section>`;
}

function placePage(place) {
  const slug = encodeURIComponent(place.id);
  const canonical = `${origin}/destination/${slug}.html`;
  const desc = `${place.short || place.summary || ''} ${place.bnShort || ''}`.trim().slice(0,290);
  const img = photos[place.id] || {};
  const shareImage = safeUrl(img.thumbnail) || `${origin}/assets/og-ashoghuri.jpg`;
  const photoCredit = (img.photos || []).slice(0,1).map(p => `<p class="photo-credit">${langs(`Photo: ${p.author || 'credit unavailable'} · ${p.license || 'check license'}`,`ছবি: ${p.author || 'কৃতিত্ব অনুল্লেখিত'} · ${p.license || 'লাইসেন্স যাচাই করুন'}`)} ${safeUrl(p.page) ? `<a href="${safeUrl(p.page)}" target="_blank" rel="noopener noreferrer">Source ↗</a>` : ''}</p>`).join('');
  const stops = place.stops || [];
  const bnStops = place.bnStops || [];
  const tags = (place.tags || []).map((x,i) => `<span class="tag">${esc(x)}${place.bnTags?.[i] ? ` · ${esc(place.bnTags[i])}` : ''}</span>`).join('');
  const jsonLd = { '@context':'https://schema.org', '@type':'TouristAttraction', name:place.name, alternateName:place.bn, description:place.summary || place.short, url:canonical, image:shareImage, address:{'@type':'PostalAddress',addressLocality:place.district,addressRegion:place.division,addressCountry:'BD'}, touristType:place.tags || [] };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(desc)}"><meta name="theme-color" content="#f6f4ea"><title>${esc(place.name)} | ${esc(place.district)} travel guide — AshoGhuri</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Manrope:wght@600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="canonical" href="${esc(canonical)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="article"><meta property="og:site_name" content="AshoGhuri"><meta property="og:title" content="${esc(place.name)} | AshoGhuri"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(shareImage)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(place.name)} | AshoGhuri"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(shareImage)}"><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" type="image/svg+xml" href="/asho-ghuri-mark.svg"><link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png"><link rel="apple-touch-icon" href="/icons/icon-192.png"><link rel="stylesheet" href="/site-extras.css"><script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g,'\\u003c')}</script></head><body><a class="skip-link" href="#main-content">Skip to main content</a><header class="site-nav"><a href="/" class="brand">AshoGhuri</a><nav aria-label="Main"><a href="/places.html">Explore</a><a href="/planner.html">Plan a trip</a><a href="/safety.html">Safety</a></nav></header><main id="main-content" class="place-detail"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>›</span><a href="/destinations/">Destinations</a><span>›</span><span>${esc(place.name)}</span></nav><header class="place-heading"><p class="page-kicker">${esc(place.division)} · ${esc(place.district)}</p><h1>${esc(place.name)} <span lang="bn">${esc(place.bn)}</span></h1><p class="lead">${esc(place.short || '')}</p><p class="lead bn" lang="bn">${esc(place.bnShort || '')}</p><div class="tags">${tags}</div></header><section class="detail-panel"><h2>${langs('Photos','ছবি')}</h2>${photoGallery(place)}${photoCredit}</section><div class="detail-columns"><section class="detail-panel"><h2>${langs('About this place','স্থান পরিচিতি')}</h2><p>${esc(place.summary || place.short || '')}</p><p lang="bn">${esc(place.bnSummary || place.bnShort || '')}</p><p class="location-line">${langs('District','জেলা')}: ${esc(place.district)} · ${langs('Division','বিভাগ')}: ${esc(place.division)} · ${langs('Area','এলাকা')}: ${esc(place.area || place.district)}</p></section><section class="detail-panel"><h2>${langs('Plan your visit','ভ্রমণ পরিকল্পনা')}</h2><h3>${langs('Getting there','যাতায়াত')}</h3><p>${esc(place.route || '')}</p><p lang="bn">${esc(place.bnRoute || '')}</p><h3>${langs('When to go','কখন যাবেন')}</h3><p>${esc(place.season || '')}</p><p lang="bn">${esc(place.bnSeason || '')}</p><h3>${langs('Suggested stops','প্রস্তাবিত বিরতি')}</h3><ul>${stops.map((stop,i)=>`<li>${esc(stop)}${bnStops[i] ? `<br><span lang="bn">${esc(bnStops[i])}</span>` : ''}</li>`).join('')}</ul></section></div>${expensePanel(place)}<section class="detail-panel"><h2>${langs('Plan with current details','হালনাগাদ তথ্য নিয়ে পরিকল্পনা করুন')}</h2><p>${langs('Opening hours, access, transport schedules, weather and local conditions can change. Check with the responsible operator and confirm fares for your route and travel date.','খোলার সময়, প্রবেশাধিকার, যাতায়াতের সময়সূচি, আবহাওয়া ও স্থানীয় অবস্থা বদলাতে পারে। দায়িত্বশীল কর্তৃপক্ষের সঙ্গে কথা বলুন এবং রুট ও তারিখ অনুযায়ী ভাড়া নিশ্চিত করুন।')}</p>${safeUrl(place.sourceUrl) ? `<p><a href="${safeUrl(place.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(place.sourceLabel || 'Place information source')} ↗</a></p>` : ''}</section><footer class="detail-footer"><a href="/destinations/">← ${langs('All destinations','সব গন্তব্য')}</a><a href="/planner.html?place=${slug}">${langs('Plan a trip here →','এখানে ভ্রমণের পরিকল্পনা করুন →')}</a></footer></main><script src="/site-runtime.js" defer></script></body></html>`;
}

await mkdir(path.join(out,'destination'),{recursive:true});
await mkdir(path.join(out,'destinations'),{recursive:true});
for (const place of places) {
  await writeFile(path.join(out,'destination',`${place.id}.html`),placePage(place));
}
const directoryCards = places.map(place => { const plan=expensePlans[place.id]; const coverage=plan?.tripTotal?.knownLineCount||0; const access=costs[place.id]?.items?.length===0; const label=access?'Access restricted · check before travel · প্রবেশ সীমিত, যাওয়ার আগে নিশ্চিত করুন':coverage?`${coverage} sourced cost estimate(s) · full trip quote needed · ${coverage}টি সূত্রসহ খরচের অনুমান, পূর্ণ কোট প্রয়োজন`:'Expense checklist available · quotes needed · খরচের তালিকা আছে, কোট প্রয়োজন'; return `<article class="destination-card" data-search="${esc(`${place.name} ${place.bn} ${place.district} ${place.division} ${place.area||''}`.toLocaleLowerCase())}" data-division="${esc(place.division)}"><a href="/destination/${encodeURIComponent(place.id)}.html"><span class="division">${esc(place.division)} · ${esc(place.district)}</span><h2>${esc(place.name)} <span lang="bn">${esc(place.bn)}</span></h2><p>${esc(place.short || '')}</p><p lang="bn">${esc(place.bnShort || '')}</p><span class="directory-cost">${esc(label)}</span></a></article>`; }).join('\n');
const directoryHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Browse all 175 Bangladesh destination guides by place, district or division in English and Bangla."><link rel="canonical" href="${origin}/destinations/"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:type" content="website"><meta property="og:site_name" content="AshoGhuri"><meta property="og:title" content="All 175 Bangladesh destinations — AshoGhuri"><meta property="og:description" content="Search bilingual destination guides by district and division."><meta property="og:url" content="${origin}/destinations/"><meta property="og:image" content="${origin}/assets/og-ashoghuri.jpg"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="All Bangladesh destinations — AshoGhuri"><meta name="twitter:description" content="Search bilingual destination guides by district and division."><meta name="twitter:image" content="${origin}/assets/og-ashoghuri.jpg"><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" type="image/svg+xml" href="/asho-ghuri-mark.svg"><link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png"><link rel="stylesheet" href="/site-extras.css"><title>All Bangladesh destinations — AshoGhuri</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Manrope:wght@600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet"></head><body><a class="skip-link" href="#main-content">Skip to main content</a><header class="site-nav"><a href="/" class="brand">AshoGhuri</a><nav aria-label="Main"><a href="/places.html">Explore</a><a href="/planner.html">Plan a trip</a><a href="/safety.html">Safety</a></nav></header><main id="main-content" class="directory-page"><p class="page-kicker">ASHOGHURI · DESTINATION INDEX</p><h1>Explore places across Bangladesh <span lang="bn">বাংলাদেশের ভ্রমণ গন্তব্য</span></h1><p class="lead">Browse all ${places.length} place guides. Search works without JavaScript; filtering is an optional enhancement.</p><p class="lead bn" lang="bn">সব ${places.length}টি স্থানের গাইড দেখুন। জাভাস্ক্রিপ্ট বন্ধ থাকলেও গন্তব্যের তালিকা থাকবে।</p><form class="directory-controls" role="search" onsubmit="return false"><label for="destinationSearch">Find a place, district or division · স্থান, জেলা বা বিভাগ খুঁজুন</label><input id="destinationSearch" type="search" placeholder="Search in English or বাংলা"><label for="divisionFilter">Division · বিভাগ</label><select id="divisionFilter"><option value="">All divisions · সব বিভাগ</option>${[...new Set(places.map(p=>p.division))].sort().map(v=>`<option>${esc(v)}</option>`).join('')}</select><p id="directoryCount" aria-live="polite">${places.length} destinations</p></form><section class="directory-grid" aria-label="Destination guides">${directoryCards}</section></main><script>const q=document.getElementById('destinationSearch'),d=document.getElementById('divisionFilter'),c=document.getElementById('directoryCount'),cards=[...document.querySelectorAll('.destination-card')];function filter(){let n=0;for(const card of cards){const ok=card.dataset.search.includes(q.value.trim().toLocaleLowerCase())&&(!d.value||card.dataset.division===d.value);card.hidden=!ok;if(ok)n++}c.textContent=n+' destinations'}q.addEventListener('input',filter);d.addEventListener('change',filter);</script><script src="/site-runtime.js" defer></script></body></html>`;
await writeFile(path.join(out,'destinations','index.html'),directoryHtml);

const htmlNames = (await readdir(out)).filter(name => name.endsWith('.html'));
for (const name of htmlNames) {
  if (!appMeta[name]) continue;
  const file = path.join(out,name);
  const html = await readFile(file,'utf8');
  await writeFile(file,normalizeAppPage(name,html));
}
await normalize404();

const existingFiles = (await readdir(out)).filter(name => name.endsWith('.html') && name !== '404.html');
const sitemapPaths = existingFiles.filter(name => publicFiles.has(name)).map(name => name === 'index.html' ? '/' : `/${name}`);
sitemapPaths.push('/destinations/');
sitemapPaths.push(...places.map(place => `/destination/${encodeURIComponent(place.id)}.html`));
const sitemap = ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',...sitemapPaths.map(url=>`  <url><loc>${origin}${esc(url)}</loc></url>`),'</urlset>',''].join('\n');
await writeFile(path.join(out,'sitemap.xml'),sitemap);
await writeFile(path.join(out,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /404.html\nDisallow: /account.html\nDisallow: /saved.html\nSitemap: ${origin}/sitemap.xml\n`);

const assets = await (async function walk(dir, prefix='') { const { readdir, stat } = await import('node:fs/promises'); let found=[]; for (const name of await readdir(dir)) {const absolute=path.join(dir,name), rel=path.posix.join(prefix,name);const s=await stat(absolute);if(s.isDirectory())found.push(...await walk(absolute,rel));else found.push('/'+rel)}return found})(out);
const precache = [...new Set([...assets, '/manifest.webmanifest'])].filter(url => !url.endsWith('.mp4') && !url.endsWith('service-worker.js') && !url.endsWith('sitemap.xml'));
const versionHash=createHash('sha256');
for(const url of precache){versionHash.update(url);versionHash.update(await readFile(path.join(out,url.replace(/^\//,''))));}
const cacheName=`ashoghuri-${versionHash.digest('hex').slice(0,12)}`;
const sw = `const CACHE=${JSON.stringify(cacheName)};\nconst PRECACHE=${JSON.stringify(precache)};\nself.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting())));\nself.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("ashoghuri-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));\nself.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET")return;if(u.origin===location.origin){if(e.request.mode==="navigate"){e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match("/index.html"))));return}e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{if(r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r})));return}if(u.protocol==="https:"&&(u.hostname==="commons.wikimedia.org"||u.hostname==="upload.wikimedia.org"||u.hostname==="thumb.wikimedia.org"||u.hostname==="fonts.gstatic.com")){e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{if(r.ok||r.type==="opaque")caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r})).catch(()=>caches.match(e.request)));}});`;
await writeFile(path.join(out,'service-worker.js'),sw);
await writeFile(path.join(out,'manifest.webmanifest'),JSON.stringify({name:'AshoGhuri — Bangladesh travel guide',short_name:'AshoGhuri',start_url:'/',display:'standalone',background_color:'#f6f4ea',theme_color:'#1c5c49',description:'Bilingual Bangladesh destination guides and trip planning.',icons:[{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icons/icon-512-maskable.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},null,2)+'\n');
console.log(`Generated ${places.length} destination pages, 1 directory, metadata for ${htmlNames.filter(name=>appMeta[name]).length} app pages, and a ${sitemapPaths.length}-URL sitemap.`);
