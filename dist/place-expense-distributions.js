/* Per-place cost components and separate full-trip-total completeness state. */
(function () {
  var places = window.AshoGhuriPlaceDB || [];
  var references = window.AshoGhuriBudgetReferences || {};
  var costs = window.AshoGhuriPlaceCostDB || {};
  var out = Object.create(null);
  var today = "2026-10-29";
  var labels = {
    route: ["Intercity transport", "দূরপাল্লার যাতায়াত"],
    local: ["Local transfer / boat", "স্থানীয় যাতায়াত / নৌকা"],
    entry: ["Entry / access fee", "প্রবেশ / প্রবেশাধিকার ফি"],
    meals: ["Meals", "খাবার"],
    stay: ["Accommodation", "থাকা"],
    activity: ["Activities / guide / rental", "কার্যক্রম / গাইড / সরঞ্জাম ভাড়া"],
    access: ["Permit / parking / tolls", "পারমিট / পার্কিং / টোল"]
  };
  var stateLabels = {
    known_estimate: ["Sourced estimate", "সূত্রসহ অনুমান"],
    needs_quote: ["Quote to confirm", "কোট নিশ্চিত করুন"],
    not_priced: ["No public price", "প্রকাশিত দর নেই"],
    not_applicable: ["Not in this plan", "এই পরিকল্পনায় নেই"]
  };
  function has(words, pattern) { return pattern.test(words); }
  function valueText(x) { return String(x == null ? "" : x); }
  function makeLine(key, state, amount, note, bnNote, source) {
    return { key:key, label:labels[key][0], bnLabel:labels[key][1], state:state,
      stateLabel:stateLabels[state][0], bnStateLabel:stateLabels[state][1],
      amount:amount || "", note:note, bnNote:bnNote, source:source || "" };
  }
  function hasFare(value) {
    if (typeof value === "number") return isFinite(value);
    var s = valueText(value).trim();
    return /(?:৳|\bBDT\b|\bTk\.?|\bTaka\b|টাকা)\s*[\d০-৯]|[\d০-৯]\s*(?:৳|\bBDT\b|\bTk\.?|\bTaka\b|টাকা)/i.test(s) || /^[\d০-৯][\d০-৯,.]*(?:\s*(?:-|–|to)\s*[\d০-৯][\d০-৯,.]*)?$/i.test(s);
  }
  function pricedOnly(lines) { return lines.filter(function (line) { return hasFare(line.value || line.bnValue); }); }
  places.forEach(function (place) {
    var ref = references[place.id] || {}, record = costs[place.id] || {};
    var components = Array.isArray(ref.components) ? ref.components : [];
    var feeItems = Array.isArray(record.items) ? record.items : [];
    var context = [place.name, place.district, place.area, place.short, place.summary, place.season, place.route,
      (place.tags || []).join(" "), (place.interests || []).join(" ")].join(" ").toLowerCase();
    var componentSources = components.map(function (c) { return c.sourceLabel; }).filter(Boolean);
    var sourceName = [record.sourceLabel, ref.sourceLabel, place.sourceLabel].concat(componentSources).filter(Boolean).filter(function (x, i, a) { return a.indexOf(x) === i; }).join("; ");
    var sourceLinks=[];
    function addSource(label,url){if(url&& !sourceLinks.some(function(x){return x.url===url;}))sourceLinks.push({label:label||"Price source",url:url});}
    addSource(record.sourceLabel,record.sourceUrl);addSource(ref.sourceLabel,ref.sourceUrl);addSource(ref.officialLabel,ref.officialUrl);addSource(ref.bookingLabel,ref.bookingUrl);
    components.forEach(function(c){addSource(c.sourceLabel||c.label,c.sourceUrl)});
    var entrySource = record.sourceLabel || ref.sourceLabel || place.sourceLabel || "Destination information";
    var hasEntrySource = !!(record.sourceUrl || ref.sourceUrl || place.sourceUrl);
    var historicalEntry = feeItems.length && (record.sourcePublishedAt || record.sourceStatus === "historical");
    var datedEntry = feeItems.length && !historicalEntry && record.sourceStatus !== "official_rate_date_unspecified";
    var currentEntry = datedEntry;
    var confirmedEntry = currentEntry && (/remain in force|until further order/i.test(record.sourceBasis || "") || record.sourceStatus === "official_current");
    function componentLines(keys) { return components.filter(function (c) { return keys.indexOf(c.key) >= 0; }); }
    function entryLines() { return components.filter(function (c) { return c.key === "entry"; }); }
    function componentAmount(lines) { return lines.map(function (c) { return valueText(c.label || c.bnLabel) + ": " + valueText(c.value || c.bnValue); }).join("; "); }
    function componentSource(lines) { return lines.map(function (c) { return c.sourceLabel; }).filter(Boolean).filter(function (x, i, a) { return a.indexOf(x) === i; }).join("; ") || ref.sourceLabel || ""; }
    var routeLines = componentLines(["transport"]);
    var localLines = componentLines(["local"]);
    var mealLines = componentLines(["food", "meals"]);
    var stayLines = componentLines(["stay", "accommodation", "lodging"]);
    var serviceLines = componentLines(["guide", "boat", "activity", "activities"]);
    var routePrices = pricedOnly(routeLines), localPrices = pricedOnly(localLines), mealPrices = pricedOnly(mealLines), stayPrices = pricedOnly(stayLines), servicePrices = pricedOnly(serviceLines);
    var entryRefs = entryLines(), entryPrices = pricedOnly(entryRefs);
    var entryFeeItems = feeItems.filter(function(i){return !i.category || /entry|admission/i.test(i.category);});
    var activityFeeItems = feeItems.filter(function(i){return i.category && /activity|guide|boat|rental/i.test(i.category);});
    var accessFeeItems = feeItems.filter(function(i){return i.category && !/entry|admission|activity|guide|boat|rental/i.test(i.category);});
    function costItemAmount(items) { return items.filter(function(i){return hasFare(i.amount);}).map(function (i) {
      var unit=valueText(i.unit), foreign=/\bUSD\b|US dollars?/i.test(unit), shownUnit=unit.replace(/\bUSD\b/ig,"").trim();
      return valueText(i.label || i.bnLabel) + ": " + (foreign ? "USD " : "৳") + valueText(i.amount) + (shownUnit ? " / " + shownUnit : "");
    }).join("; "); }
    var entryAmount = entryFeeItems.length ? costItemAmount(entryFeeItems) : componentAmount(entryPrices);
    var activityFeeAmount = costItemAmount(activityFeeItems);
    var accessFeeAmount = costItemAmount(accessFeeItems);
    var strongAccess = has(context, /permit|restricted|regulated|convoy|access condition|seasonal|forest|island|checkpoint|guide required|protected/);
    var outdoor = has(context, /nature|water|boat|hike|forest|hill|island|eco|adventure|seasonal/);
    var overnight = !/^(day|half day|half-day)$/i.test(String(place.duration || ""));
    var routeNote = "No live route quote is connected. For diesel buses, the latest published baseline from 22 Sep 2026 is ৳2.40/km inter-district/long-distance, ৳2.70/km city bus and ৳2.60/km in DTCA areas; this does not determine your exact route ticket, tolls, premium/AC fare or gas-run fares. The supplied Aug 2026 charts predate this change. Check the current BRTA route chart and operator for your origin, date, class and return leg.";
    var routeNoteBn = "লাইভ রুট-কোট যুক্ত নেই। ডিজেল বাসের ২২ সেপ্টেম্বর ২০২৬ থেকে প্রকাশিত ভিত্তি-হার আন্তঃজেলা/দূরপাল্লায় ৳২.৪০/কিমি, মহানগর বাসে ৳২.৭০/কিমি এবং DTCA এলাকায় ৳২.৬০/কিমি; এগুলো আপনার নির্দিষ্ট রুটের টিকিট, টোল, প্রিমিয়াম/এসি বা গ্যাসচালিত বাসের দর নয়। সরবরাহ করা আগস্ট ২০২৬-এর চার্ট এই পরিবর্তনের আগের। শুরুর স্থান, তারিখ, শ্রেণি ও আসা-যাওয়ার জন্য বর্তমান BRTA রুট-চার্ট ও অপারেটরের দর দেখুন।";
    if (routePrices.length) { routeNote += " Published route reference: " + componentAmount(routePrices) + ". Confirm it is current."; routeNoteBn += " প্রকাশিত রুট-সূত্র: " + componentAmount(routePrices) + "। বর্তমান দর নিশ্চিত করুন।"; }
    else if (routeLines.length) { routeNote += " A route or operator is identified, but no fare amount is published in the cited reference. Request a dated quote."; routeNoteBn += " রুট বা অপারেটরের তথ্য আছে, কিন্তু উদ্ধৃত সূত্রে ভাড়ার অঙ্ক নেই। তারিখসহ কোট নিন।"; }
    var localNote = "Ask the local operator for the last-mile fare, vehicle/boat size, waiting time and return terms.";
    var localNoteBn = "শেষ অংশের ভাড়া, গাড়ি/নৌকার আকার, অপেক্ষা ও ফেরার শর্ত স্থানীয় অপারেটরের কাছে নিন।";
    if (localPrices.length) { localNote += " Published reference: " + componentAmount(localPrices) + "."; localNoteBn += " প্রকাশিত সূত্র: " + componentAmount(localPrices) + "।"; }
    else if (localLines.length) { localNote += " A local service is identified, but no fare amount is published in the cited reference. Request a dated quote."; localNoteBn += " স্থানীয় সেবার তথ্য আছে, কিন্তু উদ্ধৃত সূত্রে ভাড়ার অঙ্ক নেই। তারিখসহ কোট নিন।"; }
    var lines = [
      makeLine("route", routePrices.length ? "known_estimate" : "not_priced", componentAmount(routePrices), routeNote, routeNoteBn, routePrices.length ? componentSource(routePrices) : routeLines.length ? componentSource(routeLines) : ""),
      makeLine("local", localPrices.length ? (/(no reliable current|quote required|conflicting|superseded|pre-revision)/i.test(componentAmount(localPrices) + " " + localPrices.map(function(c){return c.note||"";}).join(" ")) ? "needs_quote" : "known_estimate") : "not_priced", componentAmount(localPrices), localNote, localNoteBn, localPrices.length ? componentSource(localPrices) : localLines.length ? componentSource(localLines) : ""),
      makeLine("entry", confirmedEntry ? "known_estimate" : (historicalEntry ? "not_priced" : (entryAmount ? "needs_quote" : "not_priced")), historicalEntry ? "" : entryAmount,
        confirmedEntry ? (record.sourceBasis || "Official posted rate; admission only.") : historicalEntry ? ((record.sourceBasis || "Historical published admission rates.") + " Historical figure(s) are shown below for context only; do not use as current trip costs.") : entryAmount ? (record.sourceBasis || "Published rate reference; confirm current amount and eligibility.") : hasEntrySource ? "The linked destination information does not publish a current entry fee. Ask the venue or responsible authority whether admission is charged and confirm the exact amount and visitor class. Do not assume ৳0." : "No current admission amount or reliable venue source is recorded. Locate the responsible venue/authority before budgeting; do not assume ৳0.",
        confirmedEntry ? (record.bnSourceBasis || "সরকারি প্রকাশিত হার; শুধু প্রবেশমূল্য।") : historicalEntry ? ((record.bnSourceBasis || "ঐতিহাসিক প্রকাশিত প্রবেশমূল্য।") + " নিচের ঐতিহাসিক অঙ্ক শুধু তথ্যের জন্য; বর্তমান ভ্রমণ-খরচ হিসেবে ব্যবহার করবেন না।") : entryAmount ? (record.bnSourceBasis || "প্রকাশিত ফির সূত্র; বর্তমান অঙ্ক ও প্রযোজ্যতা নিশ্চিত করুন।") : hasEntrySource ? "সংযুক্ত গন্তব্য-তথ্যে বর্তমান প্রবেশমূল্য প্রকাশিত নেই। প্রবেশ ফি আছে কি না এবং দর্শনার্থীর শ্রেণিভেদে সঠিক অঙ্ক দায়িত্বপ্রাপ্ত কর্তৃপক্ষকে জিজ্ঞেস করুন। ৳০ ধরে নেবেন না।" : "বর্তমান প্রবেশমূল্য বা নির্ভরযোগ্য স্থানীয় সূত্র নেই। বাজেট করার আগে দায়িত্বপ্রাপ্ত স্থান/কর্তৃপক্ষ খুঁজুন; ৳০ ধরে নেবেন না।",
        feeItems.length ? record.sourceLabel : entryPrices.length ? componentSource(entryPrices) : entryRefs.length ? componentSource(entryRefs) : hasEntrySource ? entrySource : ""),
      makeLine("meals", mealPrices.length ? "known_estimate" : "not_priced", componentAmount(mealPrices), mealPrices.length ? "Published meal-budget estimate; confirm menu, meal count and current local prices. Add only the meals you expect to buy." : "No meal price is published for this destination. Set a per-person daily food budget and confirm it locally.", mealPrices.length ? "প্রকাশিত খাবার বাজেটের অনুমান; খাবারের তালিকা, বেলার সংখ্যা ও স্থানীয় বর্তমান দাম নিশ্চিত করুন। যত বেলা খাবেন শুধু তা যোগ করুন।" : "খাবারের দাম প্রকাশিত নেই; জনপ্রতি দৈনিক বাজেট ঠিক করে স্থানীয়ভাবে নিশ্চিত করুন।", mealPrices.length ? componentSource(mealPrices) : ""),
      makeLine("stay", stayPrices.length ? "known_estimate" : (overnight ? "not_priced" : "not_applicable"), componentAmount(stayPrices), stayPrices.length ? "Published room-rate estimate only; property, room type, date, occupancy and availability change the payable amount. Confirm directly with the property." : overnight ? "No room price is recorded for this destination. Request a dated quote and confirm occupancy, taxes and cancellation terms." : "Lodging is not included in this day-trip plan. If you choose to stay overnight, request a dated room quote and add it separately.", stayPrices.length ? "প্রকাশিত কক্ষভাড়ার অনুমানমাত্র; প্রতিষ্ঠান, কক্ষের ধরন, তারিখ, ধারণক্ষমতা ও প্রাপ্যতায় মূল্য বদলায়। সরাসরি নিশ্চিত করুন।" : overnight ? "এই গন্তব্যের কক্ষভাড়া রেকর্ড করা নেই। তারিখসহ কোট নিন; ধারণক্ষমতা, কর ও বাতিলের শর্ত নিশ্চিত করুন।" : "দিনের ভ্রমণসূচিতে থাকা অন্তর্ভুক্ত নয়। রাতে থাকার সিদ্ধান্ত নিলে তারিখসহ কক্ষের কোট আলাদাভাবে নিন।", stayPrices.length ? componentSource(stayPrices) : ""),
      makeLine("activity", (servicePrices.length || activityFeeItems.length) ? (/(no reliable current|quote required|conflicting|superseded|pre-revision)/i.test(componentAmount(servicePrices) + " " + servicePrices.map(function(c){return c.note||"";}).join(" ")) ? "needs_quote" : "known_estimate") : (serviceLines.length || outdoor ? "not_priced" : "not_applicable"), [componentAmount(servicePrices), activityFeeAmount].filter(Boolean).join("; "),
        (serviceLines.length || activityFeeItems.length) ? "Published guide/activity/rental references only; confirm current rate, group size, duration and inclusions. Where facility fees are listed, check whether they are operating." : outdoor ? "Ask whether a guide, boat, equipment or activity charge applies on your date; get the operator’s current quote." : "No paid extra activity is included in the suggested visit. Optional guides or activities are separate; request a quote only if you add one.",
        (serviceLines.length || activityFeeItems.length) ? "প্রকাশিত গাইড/কার্যক্রম/ভাড়ার সূত্রমাত্র; বর্তমান দর, দলের আকার, সময় ও অন্তর্ভুক্তি নিশ্চিত করুন। স্থাপনার ফি থাকলে সেবা চালু কি না যাচাই করুন।" : outdoor ? "আপনার তারিখে গাইড, নৌকা, সরঞ্জাম বা কার্যক্রমের ফি আছে কি না জেনে বর্তমান কোট নিন।" : "প্রস্তাবিত ভ্রমণে অতিরিক্ত পেইড কার্যক্রম অন্তর্ভুক্ত নয়। গাইড বা কার্যক্রম যোগ করলে তার জন্য আলাদা কোট নিন।",
        (servicePrices.length ? componentSource(servicePrices) : serviceLines.length ? componentSource(serviceLines) : "") + (activityFeeItems.length ? ((servicePrices.length || serviceLines.length) ? "; " : "") + (record.sourceLabel || "Destination cost guide") : "")),
      makeLine("access", accessFeeAmount ? "needs_quote" : strongAccess ? "not_priced" : "not_applicable", accessFeeAmount,
        accessFeeAmount ? "Published parking/permit/access tariff reference: " + accessFeeAmount + ". Vehicle class and site/date determine whether it applies; it is not a per-person admission amount. Confirm the current payable charge." : strongAccess ? "No permit/access amount is published here. Confirm current restrictions, fees, parking and tolls with the responsible authority or operator." : "No special permit or access charge is included in the standard public visit. Parking and tolls depend on the transport you choose; add them if applicable.",
        accessFeeAmount ? "প্রকাশিত পার্কিং/পারমিট/প্রবেশাধিকার ফির সূত্র: " + accessFeeAmount + "। গাড়ির শ্রেণি ও স্থান/তারিখ অনুযায়ী প্রযোজ্যতা বদলায়; এটি জনপ্রতি প্রবেশমূল্য নয়। বর্তমান পরিশোধযোগ্য অঙ্ক নিশ্চিত করুন।" : strongAccess ? "দায়িত্বপ্রাপ্ত কর্তৃপক্ষ বা অপারেটরের কাছে বর্তমান পারমিট, প্রবেশ-নিষেধ, ফি, পার্কিং ও টোল নিশ্চিত করুন।" : "সাধারণ দর্শনার্থীর ভ্রমণসূচিতে বিশেষ পারমিট বা প্রবেশ-ফি ধরা হয়নি। নির্বাচিত যানবাহনের ওপর পার্কিং ও টোল নির্ভর করে; প্রযোজ্য হলে যোগ করুন।",
        accessFeeAmount ? (record.sourceLabel || ref.sourceLabel || "Destination ticket tariff") : "")
    ];
    if (historicalEntry) lines[2].referenceAmount = entryAmount;
    var knownLineCount = lines.filter(function (line) { return line.state === "known_estimate"; }).length;
    var quotedLineCount = lines.filter(function (line) { return line.state === "needs_quote"; }).length;
    var unpricedLineCount = lines.filter(function (line) { return line.state === "not_priced"; }).length;
    var notApplicableLineCount = lines.filter(function (line) { return line.state === "not_applicable"; }).length;
    out[place.id] = { id:place.id, reviewedAt:today, currency:"BDT", items:lines,
      planningReference: ref.tripEstimate ? {
        value: ref.tripEstimate.value || "",
        bnValue: ref.tripEstimate.bnValue || ref.tripEstimate.value || "",
        scope: ref.tripEstimate.scope || "Reported planning reference; not a complete trip total.",
        bnScope: ref.tripEstimate.bnScope || "প্রতিবেদিত পরিকল্পনা-সূত্র; পূর্ণ ভ্রমণমূল্য নয়।",
        note: ref.tripEstimate.note || "A guide-level estimate. Confirm all component prices for your route and date.",
        bnNote: ref.tripEstimate.bnNote || "গাইডে প্রকাশিত আনুমানিক হিসাব। রুট ও তারিখ অনুযায়ী প্রতিটি খরচ নিশ্চিত করুন।",
        sourceLabel: ref.tripEstimate.sourceLabel || ref.sourceLabel || "Destination budget reference",
        sourceUrl: ref.tripEstimate.sourceUrl || ref.sourceUrl || "",
        checkedAt: ref.tripEstimate.checkedAt || ref.checkedAt || "",
        status: ref.tripEstimate.status || "reported_planning_estimate"
      } : null,
      tripTotal:{ state:"incomplete", amount:null, perPersonAmount:null, currency:"BDT",
        lineCount:lines.length, knownLineCount:knownLineCount, needsQuoteLineCount:quotedLineCount,
        notPricedLineCount:unpricedLineCount, notApplicableLineCount:notApplicableLineCount,
        note:"No complete origin-, date-, group- and service-specific trip total has been verified for this destination. Component rates are not a full trip price." },
      sourceLabel:sourceName, sourceUrl:record.sourceUrl || ref.sourceUrl || place.sourceUrl || "", sources:sourceLinks,
      officialFareUrl:"https://brta.gov.bd/pages/static-pages/6922de1b933eb65569e184a9",
      latestFareNoticeUrl:"https://www.bssnews.net/news/427466",
      trainTicketUrl:"https://eticket.railway.gov.bd/en",
      busTicketUrl:"https://bdtickets.com/" };
  });
  window.AshoGhuriPlaceExpensePlanDB = out;
})();
