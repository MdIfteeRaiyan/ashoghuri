import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const dataWindow = {};
const context = vm.createContext({ window: dataWindow });
for (const file of ['place-db.js','place-db-batch.js','place-db-country-completion.js','place-image-db.js','place-cost-db.js','place-budget-references.js','place-expense-distributions.js']) {
  vm.runInContext(await readFile(path.join(dist,file),'utf8'),context,{filename:file,timeout:5000});
}
const places = Array.from(dataWindow.AshoGhuriPlaceDB || []);
const photos = dataWindow.AshoGhuriPlaceImageDB || {};
const costs = dataWindow.AshoGhuriPlaceCostDB || {};
const expensePlans = dataWindow.AshoGhuriPlaceExpensePlanDB || {};
const ids = new Set();
assert(places.length===175,`Expected 175 place records; found ${places.length}`);
for (const place of places) {
  assert(place.id && !ids.has(place.id),`Missing or duplicate place id: ${place.id || '(blank)'}`); ids.add(place.id);
  for (const key of ['name','bn','district','division','summary','bnSummary','sourceUrl']) assert(String(place[key]||'').trim(),`${place.id}: missing ${key}`);
  assert(/^https:\/\//.test(place.sourceUrl||''),`${place.id}: source URL must use HTTPS`);
  const image=photos[place.id];
  assert(Boolean(image),`${place.id}: missing image record or explicit fallback`);
  if(image?.status==='curated_match'){
    assert(Array.isArray(image.photos)&&image.photos.length>0,`${place.id}: curated photo record has no photo`);
    for(const photo of image.photos||[]){
      assert(/^https:\/\//.test(photo.thumbnail||''),`${place.id}: photo has no HTTPS thumbnail`);
      assert(/^https:\/\//.test(photo.page||''),`${place.id}: photo has no source page`);
      assert(String(photo.author||'').trim(),`${place.id}: photo credit missing`);
      assert(String(photo.license||'').trim(),`${place.id}: photo license missing`);
    }
  } else if(image?.status==='fallback') {
    assert(Array.isArray(image.photos)&&image.photos.length===0,`${place.id}: fallback must not contain unverified destination photos`);
    assert(/^\/assets\/place-fallbacks\/(?:landscape|forest|water|heritage|worship|restricted)\.svg$/.test(image.fallbackImage||''),`${place.id}: fallback illustration is missing or invalid`);
    assert(String(image.fallbackReason||'').trim(),`${place.id}: fallback reason is missing`);
  } else assert(false,`${place.id}: photo needs review or has unknown state ${image?.status}`);
  const plan=expensePlans[place.id];
  assert(plan&&Array.isArray(plan.items)&&plan.items.length===7,`${place.id}: expected a 7-category expense checklist`);
  if(plan?.items){
    const keys=new Set(plan.items.map(item=>item.key));
    for(const key of ['route','local','entry','meals','stay','activity','access'])assert(keys.has(key),`${place.id}: expense checklist missing ${key}`);
    for(const item of plan.items){
      assert(['known_estimate','needs_quote','not_priced','not_applicable'].includes(item.state),`${place.id}/${item.key}: invalid expense state ${item.state}`);
      assert(String(item.note||'').trim()&&String(item.bnNote||'').trim(),`${place.id}/${item.key}: expense explanation is missing in English or Bangla`);
      if(item.state==='known_estimate')assert(String(item.amount||'').trim(),`${place.id}/${item.key}: sourced estimate has no amount`);
    }
    assert(plan.tripTotal?.state==='incomplete'&&plan.tripTotal.amount===null,`${place.id}: trip total must remain explicitly incomplete until route/date data is verified`);
  }
  if(costs[place.id]){
    const cost=costs[place.id];
    assert(/^https:\/\//.test(cost.sourceUrl||''),`${place.id}: cost record has no HTTPS source`);
    assert(Boolean(cost.checkedAt),`${place.id}: cost record needs a review date`);
    assert(Array.isArray(cost.items)&&(cost.items.length>0||cost.sourceStatus==='official_rate_date_unspecified'),`${place.id}: cost record has no components or explicit source status`);
    for(const item of cost.items||[]) assert(item.amount!==undefined && item.unit,`${place.id}: cost item must include amount and unit`);
  }
}

const walk=async dir=>{let files=[];for(const name of await readdir(dir)){const p=path.join(dir,name);const s=await stat(p);if(s.isDirectory())files.push(...await walk(p));else files.push(p)}return files};
const allFiles=await walk(dist);
for(const place of places){const image=photos[place.id];if(image?.status==='fallback')assert(allFiles.includes(path.join(dist,image.fallbackImage.slice(1))),`${place.id}: missing fallback SVG ${image.fallbackImage}`)}
const htmlFiles=allFiles.filter(f=>f.endsWith('.html'));
assert(htmlFiles.length===188,`Expected 188 HTML files (175 detail pages + directory + app and 404 pages); found ${htmlFiles.length}`);
const sitemap=await readFile(path.join(dist,'sitemap.xml'),'utf8');
const config=JSON.parse(await readFile(path.join(root,'site.config.json'),'utf8'));
assert(!sitemap.includes('chatgpt.site'),`Sitemap still contains the preview domain`);
const sitemapUrls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
assert(new Set(sitemapUrls).size===sitemapUrls.length,'Sitemap contains duplicate URLs');
assert(sitemapUrls.filter(x=>x===`${config.siteUrl.replace(/\/$/,'')}/`).length===1,'Home URL must appear exactly once in sitemap');
assert(!sitemap.includes('/saved.html')&&!sitemap.includes('/account.html')&&!sitemap.includes('/404.html'),'Sitemap includes a private or error page');
const robots=await readFile(path.join(dist,'robots.txt'),'utf8');
assert(robots.includes(`${config.siteUrl.replace(/\/$/,'')}/sitemap.xml`),'robots.txt does not reference the configured sitemap');
const vercel=JSON.parse(await readFile(path.join(root,'vercel.json'),'utf8'));
const csp=vercel.headers.flatMap(h=>h.headers||[]).find(h=>h.key.toLowerCase()==='content-security-policy')?.value||'';
assert(csp.includes('thumb.wikimedia.org')&&csp.includes('upload.wikimedia.org'),'CSP does not allow the Wikimedia thumbnail hosts');
const manifest=JSON.parse(await readFile(path.join(dist,'manifest.webmanifest'),'utf8'));
for(const icon of manifest.icons) assert((await stat(path.join(dist,icon.src.replace(/^\//,'')))).isFile(),`Missing PWA icon: ${icon.src}`);

const routeNames=new Set(allFiles.map(f=>'/'+path.relative(dist,f).split(path.sep).join('/')));
const toTarget=(from,raw)=>{
  const value=raw.trim(); if(!value||value.startsWith('#')||/^(?:https?:|mailto:|tel:|javascript:|data:|blob:)/i.test(value))return null;
  let clean=value.split('#')[0].split('?')[0]; if(!clean)return null;
  if(!clean.startsWith('/')) clean='/'+path.posix.join(path.posix.dirname(path.relative(dist,from)).split(path.sep).join('/'),clean);
  if(clean==='/')clean='/index.html';
  else if(clean.endsWith('/'))clean+='index.html';
  return clean;
};
for(const file of htmlFiles){
  const html=await readFile(file,'utf8');
  const rel=path.relative(dist,file).split(path.sep).join('/');
  if(rel==='404.html')continue;
  if(rel.startsWith('destination/')){
    const id=path.basename(rel,'.html');
    assert((html.match(/class="expense-line /g)||[]).length===7,`${rel}: generated page does not show all 7 expense categories`);
    assert(/Full trip total unavailable/.test(html),`${rel}: full-trip-total limitation is not clearly stated`);
    assert(!/Illustration fallback; no verified destination photo yet/.test(html),`${rel}: outdated photo fallback copy remains`);
    assert(!/class="expense-source-label"/.test(html),`${rel}: source labels should be consolidated in the collapsed source list`);
  }
  assert(/<title>[^<]+<\/title>/i.test(html),`${rel}: missing title`);
  assert(/<meta name="description" content="[^"]+"/i.test(html),`${rel}: missing description`);
  assert(/<link rel="canonical" href="https:\/\//i.test(html),`${rel}: missing canonical`);
  assert(/property="og:title"/.test(html)&&/property="og:image"/.test(html),`${rel}: missing social metadata`);
  const h1Count=(html.match(/<h1\b/gi)||[]).length;
  assert(h1Count===1,`${rel}: expected exactly one page-level H1; found ${h1Count}`);
  const attrs=[...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)];
  for(const m of attrs){const target=toTarget(file,m[1]);if(target&&!routeNames.has(target))errors.push(`${rel}: broken local link ${m[1]} → ${target}`)}
}
const videoPage=await readFile(path.join(dist,'index.html'),'utf8');
assert(!/<video\b[^>]*\bautoplay\b/i.test(videoPage),'Hero video still has autoplay in markup');
assert(/saveData|effectiveType/.test(await readFile(path.join(dist,'site-runtime.js'),'utf8')),'Video connection gating is missing');
assert(allFiles.some(f=>f.endsWith('/service-worker.js')),'Service worker is missing');
const worker=await readFile(path.join(dist,'service-worker.js'),'utf8');
assert(worker.includes('commons.wikimedia.org'),'Service worker does not cache Wikimedia file redirects');
const sharedCss=await readFile(path.join(dist,'site-extras.css'),'utf8');
assert(sharedCss.includes('.photo-showcase .photo-stage{height:clamp(210px,36vh,340px)'),'Photo gallery preview is not constrained for normal viewport height');
assert(sharedCss.includes('.commons-gallery .photo-stage,.photo-showcase .photo-stage{height:clamp(150px,30vh,270px)'),'Trip details photo gallery is not constrained for normal desktop height');
assert(sharedCss.includes('.photo-showcase-controls button:focus-visible'),'Photo slideshow controls need a visible keyboard focus state');
const siteExtras=await readFile(path.join(dist,'site-extras.js'),'utf8');
assert(siteExtras.includes('trip-estimate-notice>span,#modalContent .trip-estimate-notice>details{display:block!important'),'Destination cost scope text must render on its own readable line');
assert(!siteExtras.includes('setTimeout(addTravelThought,500)'),'A floating travel tip must not cover the first viewport');
const safetyHtml=await readFile(path.join(dist,'safety.html'),'utf8');
assert(/<details class="hotline-source-disclosure">/.test(safetyHtml),'Official hotline sources should be collapsed by default');
assert(!/<div class="hotline-sources">/.test(safetyHtml.replace(/<details class="hotline-source-disclosure">[\s\S]*?<\/details>/,'')),'Hotline source links are duplicated outside the collapsed source group');

if(errors.length){console.error(`Validation failed with ${errors.length} error(s):`);for(const error of errors)console.error(`- ${error}`);process.exit(1)}
console.log(`Validation passed: ${places.length} place records, ${htmlFiles.length} HTML files, ${sitemapUrls.length} sitemap URLs, image/cost source checks, PWA metadata and local links.`);
