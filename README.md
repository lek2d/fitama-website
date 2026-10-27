# FiTama website

## October 28, 2026 — Tama-Guide source reconciliation

Reconciled public Guide copy against the latest GitHub `lek2d/Fitama` default branch, `main` at `da5498044911a3e8e962d918701552fca306114a` (verified October 28). Updated 28 existing articles and added Invite Friends, bringing the guide to 41 topics. Items, potion limits, dungeon entry/rest/leave/loot rules, NPC goals, ranking rewards, referrals and Parcel terminology now reflect that source. The 21 shop prices, 24 equipment entries and 12 enemy cards were compared and retained where already correct. Existing accepted quest/run cards remain authoritative for version-dependent rules.

Tama Power earning descriptions now mention workouts and movement without exposing the base calculation or earning-cap formula; matching Journey descriptions and FAQs were reconciled. Numeric quest targets, item effects and storage capacities remain as player-facing rules. Grilled Talakitok uses the original app asset from this commit (`assets/items/grilled-talakitok.png`, Git blob `4adaf710b9981a2efc35f5aec84692b0790d09e9`). The source website mirror is synchronized for these content changes.

Verification: 16 existing Guide/walkthrough tests passed; article IDs, local links/fragments/assets and absence of the removed earning formula passed structural checks. Browser checks at 1440, 390 and 320px confirmed readable tables, no page overflow, the new asset, search indexing and result-to-article navigation. Independent source/copy review found no blockers. This is a website copy/source audit, not native-app or production-feature-flag acceptance. Policy pages, chat/ads rollout settings and backend records were not modified. Private audit and browser evidence are in the task workspace under `work/tama-guide-audit-2026-10-28/` and `outputs/Fitama-Guide-Audit-2026-10-28/`.

## October 27, 2026 — dark-green header

Changed the shared header and mobile menu from black to dark green `#123b2c`, retaining 40% opacity, 16px backdrop blur and no border. Publisher and source mirror match; Journey, Guide and Contact request the refreshed navigation stylesheet. Desktop 1440px and mobile 390px browser checks confirm the requested color/alpha, blur, border and no horizontal overflow. No navigation behavior changes.

## October 27, 2026 — lighter borderless header

Reduced the shared header and mobile menu background from 70% to 40% black and removed the header border. The 16px backdrop blur and existing content colors remain. Navigation stylesheet cache URLs and the source mirror are synchronized. Desktop 1440px and mobile 390px browser checks confirm 40% background, zero border, retained blur and no horizontal overflow. This styling-only change does not alter navigation behavior.

## October 27, 2026 — logo-left dark header

Journey, Guide and Contact now place the logo first on the left, with Guide, social links and Get Fitama on the right. The header background is 70% black with a 16px backdrop blur; its separate background plane preserves fully opaque content and allows the mobile disclosure to blur independently. Mobile uses the same dark treatment, warm-white controls and a visible gold keyboard focus outline. Source mirrors and stylesheet cache URLs are synchronized.

Verification: all 10 existing navigation/disclosure tests passed. Browser checks at 320, 390, 699, 700, 1024 and 1440px confirmed the alignment, no horizontal overflow, and computed 70% black/16px blur. Desktop Journey and Contact plus the open mobile Journey menu were visually checked; mobile targets remain at least 44px. Independent review found no blockers.

## October 27, 2026 — clear foreground beneath the eggs

Removed the separate foreground image layer containing the three small leaf clusters directly in front of the eggs. The two side bushes continue using the same shared artwork; egg placement and preview behavior are unchanged. Desktop 1440×900 and mobile 390×844 browser checks confirm all three eggs, both bushes, no middle sprig layer and no page overflow. Source mirror synchronized and Journey's CSS URL refreshed.

## October 27, 2026 — tablet chapter centering

Extended the existing mobile chapter centering through the site's 1099px tablet breakpoint. All four chapter headings, constrained paragraphs and inline CTA buttons are centered in animated and static views; desktop alignment resumes at 1100px. Journey's stylesheet URL is refreshed. Browser checks at 320, 390, 680, 700, 768, 820, 1024, 1099, 1100 and 1440px confirm alignment, centered button/paragraph bounds and no horizontal page overflow after preview assets loaded. Source mirror synchronized. No timeline, artwork or navigation changes.

## October 27, 2026 — container-width header navigation

Journey, Guide and Contact share a header as wide as their content container, with Guide, the existing Facebook/Instagram/TikTok links and Get Fitama on the left, and the glossy logo on the right as requested. Below 700px a labeled Menu button opens a non-modal disclosure with the same links and 44px touch targets. Closed links leave the tab order; Escape restores focus, link/outside activation closes the menu, and responsive changes preserve reachable keyboard focus. Journey hiding resets the disclosure; logo and Get Fitama retain their existing smooth navigation and reduced-motion behavior. Script/import cache URLs are aligned to avoid duplicate navigation initialization.

Verification: 88 publisher tests and 200 source tests passed, including six new disclosure behavior cases. Browser checks at 320, 390, 699, 700, 1440 and 2560px confirmed no header/page overflow, logo alignment, mobile target sizes, Escape/outside dismissal, breakpoint focus, cross-page Get Fitama, and Journey's smooth-link focus/anchor handling. Guide and Contact match their 1080px content containers; Journey matches its 1120px container. A local cross-page preview initially missed styles; reload restored all styles and no overflow, so deployment acceptance includes fresh live checks. Layout detector and independent review found no remaining blockers. Source mirror synchronized; no native app, provider, form submission or automation changes.

## October 27, 2026 — mobile QA layout fixes

All four Journey chapters now center headings, copy and CTAs below their phone on mobile, including the static view. The mobile FAQ heading fits on one line at normal text size and may wrap when enlarged. Guide quick links and category buttons each use one horizontally scrolling row below 700px; selected categories remain visible after filtering/search reset, and keyboard focus stays visible through a resize. The desktop help link now uses inline flex so its existing 7px arrow gap applies. Desktop layout is preserved, and matching source files are synchronized.

Verification: 82 publisher and 194 source tests passed; the four Guide UI tests passed again after the focused-category resize refinement. Browser checks at 320, 390, 699, 700 and 1440px found no horizontal page overflow, verified centered mobile chapters, the normal-size one-line FAQ, horizontal navigation, keyboard focus, search/reset and quick-link navigation. Independent review found no blockers. The design detector reported one pre-existing content warning in a game-item description, not a new layout defect. Evidence is saved outside the public document root.

The reported Contact dropdown was observed in desktop responsive emulation. Its native select works and its ancestors have no transform or zoom offset; no custom dropdown or positioning workaround was added. The browser capture does not include the native popup, so actual phone/native popup placement remains unverified. No forms were submitted. Native app QA and automation remain paused.

## October 27, 2026 — footer credit

Journey, Guide and Contact now use the requested shared footer credit, “© 2026 Fueled by Redpots games”. Only the credit text changed; matching source pages are synchronized.

## October 27, 2026 — staggered chapter copy

The four Journey chapters now reveal their heading, paragraph and CTA in reading order, with 120ms spacing, a 560ms ease-out and 8–12px upward movement. Entry begins only when the chapter becomes visible, stays latched during scroll/resize updates, and re-arms after leaving. Keyboard focus reveals the whole message immediately for that visit. Short-screen, static and reduced-motion views retain immediately visible content. Existing panel accessibility and scroll transforms remain authoritative; no timers or new dependencies were added.

Verification: 82 publisher and 194 source tests passed. Browser checks cover desktop 1440×900, mobile 390×844, short-screen 320×568, fast scroll, reverse entry, within-chapter stability, keyboard focus/blur and motion-off. The early desktop sample showed the title entering while paragraph/button remained at zero opacity; all settled at full opacity. Independent review found no blockers. The design detector returned no findings in its degraded regex mode; browser checks provide the visual evidence. Source mirror synchronized; native app QA and automation remain paused.

## October 27, 2026 — floating companion items

The Health watch and sync phone, plus the equipment/shop sword, potion and coin, now drift gently up and down with independent 5.9–7.7-second timing. Individual CSS translate preserves their existing tilt and scroll-positioned parent transforms. Movement is bounded to 5–9px above the anchor, with no layout changes. Loops pause outside the stage or while their chapter is hidden; the existing document visibility handler also pauses them. Reduced motion and static mode disable the loops. Journey runtime URLs are versioned.

Verification: 82 publisher tests and 194 source tests passed. Browser checks at 1440×900 and 390×844 confirmed motion, preserved rotations/parent transforms, no horizontal overflow, chapter hiding, offscreen pause and static-mode removal. The actual visibility/observer handlers passed source-fragment VM checks; the in-app browser did not expose a native hidden-document state, so background-tab acceptance is not claimed. Source mirror synchronized. No native app/backend changes; QA and automation remain paused.

## October 27, 2026 — AVIF screenshot delivery

Nine approved screenshots now prefer high-quality AVIF through native picture/source selection, with the existing lossless WebP images retained as fallbacks. All27 AVIFs come directly from the same native4× PNG masters at quality94,4:4:4 full-range color. These delivery files are lossy, not pixel-identical; the source masters, approved content, resolutions and original img attributes remain unchanged.

The nine-image payload falls from5.28MB to1.74MB at780px(67.08%),10.11MB to2.92MB at1170px(71.17%), and13.89MB to3.84MB at1560px(72.38%). These are image-payload savings, not whole-page speed claims. Unsupported AVIF types use WebP. Missing/corrupt preferred files still require correction; format fallback is not network-error recovery.

Verification:82 publisher and194 source tests;27 decoded AVIF dimensions/hashes and mirror copies;56 regular plus six visible static-image geometry comparisons at six viewport sizes with no differences over0.1px. A source-element grid item found during short-screen checks was corrected by explicitly hiding source layout boxes. AVIF and unsupported-type WebP selection worked in the browser. No native app/backend changes; QA and automation remain paused.

Preferred assets: `assets/screens-2026-10-27-avif/manifest.json`; unchanged fallback provenance: `assets/screens-2026-10-27-lossless/manifest.json`. Reproduction: publisher `capture-notes/2026-10-27-avif/encode.py`. Earlier dated entries remain historical.

## October 27, 2026 — lossless app screenshots

Replaced all nine active app screenshots with fresh native PNG captures of the same approved sample screens at a real 4× browser density (1560×3376, logical390×844). The previous1170×2532 files came from a CSS-scaled iframe and JPEG-quality80 transport; increasing their dimensions could not recover sharp text. These captures use no scaled iframe or JavaScript DPR override. No screenshot was AI-redrawn, sharpened or enlarged from an older capture.

Production serves lossless WebP: full4× pixels are verified identical to each PNG master, with780×1688 and1170×2532 derivatives and responsive source selection to reduce downloads. The same14 image placements, phone sizes, timeline, funded100-coin Shop,88XP/PowerBottle result and Blukie traits are preserved. Sample data and native-release limitations remain disclosed. All1495 snapshot files matching app-source commit9e2696b were byte-identical after capture; only capture HTML helpers were added outside those originals. QA and automation remain paused.

Verification:82 publisher and194 source tests passed; all27 asset hashes/dimensions and mirror copies match. Allnine4× WebPs decode identically to their native PNG masters. Browser checks at320×568,390×844,768×1024,1440×900 and2560×1440 show loaded screens without horizontal overflow. The nine-screen set is5.28MB at2×,10.11MB at3× or13.89MB at4× versus1.81MB for the older JPEGs; responsive selection reduces transfer relative to the new full masters.

Current assets/provenance: `assets/screens-2026-10-27-lossless/manifest.json`; reproducible local capture controls and state evidence: `capture-notes/2026-10-27-lossless/`. Older dated manifests remain historical.

## October 27, 2026 — responsive hero grounding

Tall tablet layouts placed the eggs above the painted lawn: the old baseline depended only on viewport height, while the foreground artwork scales by its registered canvas width. At768×1024, contact points projected into transparent foreground rows around545. The shared egg/pet/front-plant baseline now stays at or below a measured opaque lawn row620 of the1672px source. Healthy desktop and phone compositions retain their existing baseline. The correction travels with the meadow and smoothly rejoins the original release position; egg drop, phone and chapter geometry after progress.32 remain unchanged. No artwork, Rive framing or hover behavior changed.

Verification:194 source tests and82 publisher tests passed. New regressions sample the actual PNG alpha under all three egg footprints at16 responsive sizes, including699/700px breakpoints; six previously failing tall-screen cases now pass. Independent review sampled305 active viewport pairs and65,861 lawn pixels (minimum alpha252, zero failures) and verified290,970 exact post-release field comparisons. Browser checks cover390×844,768×1024,820×1180,1440×900 and2560×1440, plus all three Rive previews on tablet, with no horizontal overflow. Source mirror synchronized. Native app QA and automation remain paused.


## October 27, 2026 — one complete pet look per hover

Unselected pets previously revealed their last Rive look on re-entry, then changed again when new random traits finished decoding. Preview visibility now belongs to the requested appearance version: the egg stays until that complete look has painted. The previous canvas hides immediately instead of fading through a replacement. The warm renderer is reused; the shared local runtime, rig and one next appearance per pet are fetched after page readiness and between interactions without hidden animation loops or delaying the page loader. A first renderer setup can still take time, and optional prefetch is not a promise of instantaneous response on every device or connection.

Clicking a published pet locks those traits; clicking while the egg is waiting locks the current request when it finishes. Subsequent interactions only change idle/happy reaction. Failed replacements retain an animated last published look only when it is still the bound canvas; otherwise the existing saved-art fallback avoids mismatched appearance metadata. No pet artwork or rig changes.

Verification: 176 source website tests and 64 publisher tests passed. The 17 controller regressions cover warm/cold reveals, stale paint cancellation, click locking and both replacement-failure paths. A local browser fixture using the actual Rive renderer showed one published appearance per synthetic pointer enter across Clovie, Blukie and Ignie, and stable selected traits on repeated Clovie reactions. Physical mouse-edge behavior was not automated. Source mirror synchronized; unrelated privacy whitespace preserved. No native app build, backend, QA or automation change.


## October 27, 2026 — continuous Journey scrolling

Removed active section snapping and mobile swipe capture at the owner's request. Desktop wheel deltas now accumulate into continuous travel with a short, frame-rate-independent 110ms exponential easing response, immediate direction reversal and no chapter destinations or gesture lock. Touch keeps native scrolling and momentum. The existing egg-drop/parallax timeline, screenshot composition, visual smoothing and smooth logo/Get Fitama navigation are preserved. Earlier 3-second opening and 1.8-second snap durations below are historical; the visitor now controls the sequence's speed. Archived section-snap helpers are no longer imported by the live runtime.

Verification: 172 source website tests and 47 publisher tests passed, including continuous delta accumulation, reversal, interruption, uncaptured touch gestures and header navigation. Desktop browser checks confirmed arbitrary intermediate scroll positions, no horizontal overflow, and completed download/home navigation. Native phone gesture feel remains unverified. Source mirror synchronized. No app build, backend, QA or automation changes.


## October 27, 2026 — softer opening egg drop

The first hero-to-app transition now has a three-second forward sequence. Phone entry and egg release have more time, and the egg eases down to a stationary island with one continuous size change instead of a rapid initial shrink. A bounded 4–8px compression replaces the previous hard catch that abruptly moved the phone; the lift and screenshot handoff follow after settling. Interpolation has gentle position, velocity and acceleration joins. The accepted hero, egg, hatch and gameplay resting poses are unchanged. Later and reverse snaps remain 1.8 seconds; interrupted forward trips scale down toward that duration.

Tests first reproduced the compressed entrance and phone contact kick. All 175 source website tests and 50 publisher tests pass. Independent review verified eight viewport sizes with no phone clipping or changes to accepted resting geometry. Desktop maximum phone travel per 60Hz frame drops from approximately 151px to 50px. Runtime module URLs are refreshed and the source mirror is synchronized. No art, metadata, policy, app, backend, app QA or automation change; unrelated Privacy/referral drafts are excluded.

## October 27, 2026 — slower eased slide transitions

Journey section snaps now take 1.8 seconds (previously 1.1) with quintic easing that has zero velocity and acceleration at both ends. Symmetric evaluation keeps the final frames numerically stable. The maximum speed is approximately 24% lower than the previous curve. Exact stops, gesture grouping, reversal, reduced-motion/static fallback and smooth header navigation retain their existing behavior. Runtime import and entry URLs are refreshed; the source mirror is synchronized.

The new slower-travel and gentle-endpoint regressions failed against the previous implementation, then passed with the change. All 166 source website tests and 41 publisher tests pass; 1,000,001 easing samples were finite, bounded and monotonic. No artwork, metadata, policy, app, backend, app QA or automation change. Unrelated working Privacy/referral drafts remain outside this release.

## October 27, 2026 — link-sharing cover

Added a 1200×630 JPEG of the approved Journey hero, preserving the actual artwork, three eggs, glossy logo and current Coming Soon badge. It is a direct CUA screenshot capture without the scrollbar, art generation or recompression; the versioned public image is `docs/assets/fitama-share-cover-v1.jpg`. Capture provenance and the metadata/crawler verification utility are in `capture-notes/2026-10-27-share/`, outside the published folder.

Root, Journey, Guide, Contact and Privacy now provide static Open Graph and large-image Twitter card metadata with absolute HTTPS image URLs, dimensions, image alt text, page-specific descriptions and canonical links. Root metadata precedes its unchanged meta/JavaScript redirect; root and Journey identify the rendered Journey URL consistently. Existing page bodies, policy prose, app/invite routing and runtime behavior are unchanged. The source mirror carries the same cover and metadata.

Verification covers the raw publisher HTML and JPEG, duplicate/missing metadata, canonical URLs and anonymous GETs with Facebook/Twitter crawler user agents. This establishes public discoverability, not that existing platform caches or old messages have refreshed; no social post or message is sent. All 163 source website tests and 38 publisher tests pass. No native app, backend, app QA or automation change.

## October 27, 2026 — smooth header navigation

On Journey, Get Fitama now scrolls smoothly to the download section after focus releases the pinned ending. The ending focus safety handler no longer overrides that explicit section navigation with an instant recenter. Clicking the logo smoothly returns to the hero without reloading the page; current query parameters remain and the download hash is cleared. Native browser travel yields to new user scroll input, while the existing section-snap driver remains unchanged. Reduced-motion/static views retain direct navigation, and modified clicks plus Guide/Contact links retain native cross-page behavior.

Four navigation regressions reproduced the previous instant/reload behavior before the fix. All 163 source website tests and 38 publisher tests pass. Navigation module URLs are refreshed on Journey, Guide and Contact. No artwork, copy, forms, app, backend, app QA or automation change.

## October 26, 2026 — Journey slide snapping

One deliberate vertical wheel burst advances one readable Journey slide; scrolling upward returns to the previous slide. Trackpad momentum is grouped so it cannot chain through multiple slides. A finite 1.1-second transition uses the existing document/timeline, including completed egg handoff and hatch poses, movement, Health, Map, Battle, Result, Equipment and Shop. The final story stop clears the fixed header above the FAQ; normal scrolling continues below it.

The existing scroll driver owns all travel. Keyboard, focus, anchors, scrollbar, resizing and visibility changes interrupt travel; horizontal gestures, zoom, dialogs, forms and nested scrollers remain usable. Reduced-motion, short-screen and artwork-failure alternatives retain normal scrolling. Mobile vertical swipe handling is scoped to the animated story and yields if the browser has already committed native scrolling. A swipe returning to its origin or finishing horizontally does not advance. Native phone/Safari gesture feel remains an owner acceptance check; automated touch-event tests and mobile-width browser checks do not establish that.

Verification: all 159 source website tests and 34 publisher tests passed. Regressions cover momentum, reversal, single-line mouse steps, boundary escape, canceled swipe, interruption and cleanup. An independent review sampled 120 active viewport pairs and 120,120 timeline frames without incomplete intro rests or copy overlap. Browser checks cover desktop/2K/mobile layouts, forward/back, FAQ escape, keyboard Home, download anchor, dialog scrolling and static fallback. The source mirror is synchronized. No artwork, native app, backend, form submission, app QA or automation changes.

## October 26, 2026 — supplied glossy logo

The owner-supplied 1444×474 transparent PNG now appears intact in the Journey hero and header, Guide, Contact, Privacy and referral/404 page. Its bytes are preserved at `docs/assets/fitama-logo-glossy.png`. Removed the previous logo's tagline image, bottom clipping and recoloring mask; existing width rules remain, with automatic height for the new proportions. The preloader and affected stylesheet/module URLs are refreshed. The source mirror is synchronized; no app asset change.

Fourteen browser layout checks covered 320–2560px Journey and mobile/desktop interior pages, with no logo clipping, stretching or horizontal overflow. All 128 website tests plus 3 invite tests pass. Policy prose and referral logic are unchanged. The design detector ran in degraded regex mode and flagged only existing font-fallback/Guide-copy patterns outside this branding change.

## October 26, 2026 — proportional navigation leaves

The Get Fitama navigation decoration was stretching a 3:1 PNG into a roughly 2:1 box. It now uses `background-size: contain`, preserving the original art proportions while keeping the existing button dimensions, 44px minimum height, label and destination. The navigation stylesheet URL is refreshed on Journey, Guide and Contact; the source mirror is synchronized. No asset or app changes.

Browser checks covered seven Journey widths from 320 through 2560px plus mobile/desktop Guide and Contact headers, with no horizontal overflow. All three headers use proportional decoration, and the Journey download action still reaches its destination. All 128 existing website tests pass. The design detector ran in degraded regex mode; its sole warning is existing Guide item-description copy, outside this styling change.

## October 26, 2026 — funded Shop showcase capture

Replaced the Shop image in Journey and Guide with a fresh 1170×2532 capture of the actual shared Shop UI. The sample balance is 100 Tama-Coins (previously 6), enough for all 21 unchanged catalog prices; all listings render without the insufficient-funds dimming. The local preview adapter footer is omitted. The image uses a new URL to avoid the previous cached screenshot. Website sample-data disclosures remain visible.

The capture fixture remains read-only: `enabled: false`, no gateway and no transaction callbacks. All 573 original app/preview files remain unchanged. Browser checks confirmed all artwork loaded, no dimmed listings on either catalog page, and no local-preview footer. Exact fixture and capture evidence are in `capture-notes/2026-10-26-shop/`, outside published `docs/`. No native app, game economy, backend, QA or automation change.

## October 26, 2026 — 3× app-screen captures

All nine app screenshots are fresh 1170×2532 captures of the same approved 390×844 sample UI. Rive canvases also render with 3× backing buffers; these files were not enlarged from old screenshots or redrawn. The original browser JPEG bytes are preserved without another encoding pass. All nine total 1,781,774 bytes, replacing 718,500 bytes of previous images. Shop browser scrollbar chrome is omitted while preserving scrolling. Existing raster artwork retains its source detail.

Updated all 14 image placements in Journey and Guide, including animated and static views. Phone/Guide sizes, animation logic, sample rewards and copy remain unchanged. Stylesheet release keys are refreshed for those two pages. Egg alignment differs by only 0.0078 logical pixels, so existing animation anchors are retained. Browser checks cover mobile through 2560×1440, including both Guide screens; 128 website tests pass. All 573 original app/preview source hashes are unchanged. Capture fixtures and provenance live outside the published folder in `capture-notes/2026-10-26-hires/`. These remain web/sample captures; no native app build, backend change, QA or automation resume.

## October 26, 2026 — centered mobile footer

Footer links, Follow Fitama, social icons and copyright are centered below 700px across Journey, Guide and Contact. Desktop alignment is unchanged. Shared stylesheet URLs are refreshed on all three pages. Twelve browser layout checks across 320, 390, 430, 699, 700 and 1440px confirmed centered mobile link/icon groups within one pixel, centered text, no horizontal overflow and the existing desktop layout.

## October 26, 2026 — mobile closing buttons below the stairs

The mobile ending now reserves the width-scaled forest scene above its controls. A copy wrapper uses a minimum height tied to the mobile artwork width; App Store / Android waitlist controls and the Android note follow below the stair edge in normal document flow. Long copy can grow the wrapper. Desktop keeps the original layout using `display: contents`, with the existing artwork and sticky-reveal fit check preserved. The Journey stylesheet URL is refreshed.

Browser checks at 320, 360, 390, 430 and 699px confirmed at least 38px between the stair edge and button boxes (including space for the store decoration), a 24px note gap, controls at least 56px high, and no horizontal overflow. Boundary 700px and desktop 1440px checks retain the desktop layout. The waitlist dialog opens, closes and restores button focus; no form was submitted. No native app, backend, QA or automation change.

## October 26, 2026 — reward preview edges and mobile alignment

The Rewards cards in the Journey battle-result screenshot had broken corners baked into the old JPEG. Recaptured the actual local sample victory UI at 780×1688 and encoded it as lossless WebP. Capture-only CSS clips the web card surface explicitly, draws its border above the surface, and disables the redundant nested backdrop blur while retaining the full result-overlay blur. Both animated and static Journey views use the new asset. The sample 88 XP / Power Bottle and app source are unchanged; this does not establish a native app fix. Capture provenance and exact CSS are in `capture-notes/2026-10-26/`, outside the published folder.

Below 700px, the movement chapter’s title, description and guide button are centered, including the static fallback. Desktop alignment is unchanged. The Journey stylesheet URL is versioned to refresh existing browser caches. Checks:63 timeline/walkthrough tests and494 local references passed; browser checks at320/390/430/699/700/1440px found no horizontal overflow, centered mobile copy/buttons, and unchanged desktop alignment. The short-screen static fallback was also checked at430×500.

## October 26, 2026 — slightly smaller screen previews

Owner requested a further small reduction after the site went live. Settled gameplay previews are5% smaller on desktop/mobile; Guide and static screenshot columns are reduced proportionally. The intro/egg landing remains unchanged. Current caps: approximately385px gameplay and232px large Guide/static previews. Only sizing and associated cache versions changed; art, Rive, preloader, policies, forms and domain/invite/ad files are unchanged.128 tests passed against the production runtime; geometry audit covered584 active viewport pairs and1,169,168 forward/reverse states with zero issues. Exact intro-state comparison is unchanged. Desktop1440×900 and mobile390×844 browser checks passed without overflow or phone/copy collisions.

## October 26, 2026 — interactive website release

Owner authorized publication to fitama.app. This website-only release replaces Coming Soon with the approved Journey landscape/parallax, three overlapping eggs, Rive pet previews with click-locked traits and Happy/Idle interaction, responsive sample app screens, Guide, Contact and Android waitlist. Initial loading shows three CSS eggs and the loading message, without the Fitama word; early styles are inline and failed artwork falls back to a readable static page. The later desktop/mobile screenshot size reduction is included.

Publish only `docs/` from main through the existing GitHub Pages configuration. App source, backend, QA, native binaries, provider settings, email/DNS and automations are outside this release. Runtime-only packaging excludes source tests, private art prompts, local paths and historical review artifacts. Runtime/font licenses remain included.

The public App Store URL returned404 and the official Philippines lookup returned resultCount0, so the App Store badge says Coming soon and is disabled. Existing `/r/CODE` invite fallback and TestFlight routing are preserved byte-for-byte. No beta group or Apple release setting changed. `CNAME`, `.nojekyll`, `app-ads.txt` and `.well-known/apple-app-site-association` are preserved.

Privacy adds only the website contact-form and Android waitlist handling prepared with those features: fields, purposes, Google Apps Script/Sheets, support delivery, duplicate/abuse records and waitlist withdrawal/retention. Existing account, Health, social, planned-chat, notifications and ads sections are unchanged. App/ads policy revisions and proposed Terms remain excluded from the public artifact; the Terms footer link is omitted until finalization. This does not enable chat or real rewarded ads or settle SDK privacy questions.

Pre-publication checks:128 existing website tests passed; all production-root JavaScript syntax checks and494 local asset/route/fragment references passed. Current Rive/trait asset closure is included. Browser checks of the exact package confirmed3-egg loading, desktop/mobile layout, actual Clovie Rive Happy selection, waitlist dialog and nested public Privacy. The temporary preview server was made quiet to prevent its output pipe from blocking requests; stale local response caches were refreshed. These are source/browser checks, not physical Safari/VoiceOver acceptance.

Both existing form endpoints returned valid read-only GET responses. No email or waitlist entry was submitted during this publication task; production acknowledgment/delivery, receiving Reply-To and sheet persistence remain separate acceptance checks. Never report successful delivery from a timeout or opaque response.

Deployment acceptance and exact source/live hashes are recorded outside the public document root. The previous deployed baseline is `f3637291516bb237beab43dfd7ea0b27f014bd14`; rollback by reverting this release commit and pushing main so Pages rebuilds. No DNS rebind is required.

---

Website-only static publication. The public site is built solely from `docs/`; the app, backend, account records, source repository history and draft policies are not included.

## Approved scope — October 18, 2026

Owner approved a private website-only repository and web DNS changes for fitama.app. GoDaddy remains the registrar and DNS/email provider. Do not change MX, SPF or nameservers, purchase plans or expose app source. The initial Support-only publication excluded the unfinished Privacy draft. The owner subsequently approved finalizing and publishing Privacy with the retention rules below; the footer now links to it.

Source design: `lek2d/Fitama` branch `codex/onboarding-ui-improvements`, commit `c56c8fa7bc5ac6dda565968ba9cf814e9c9313b7`; the Coming Soon adaptation retains the original forest-footer composition, logo and Fredoka. On October 18 the owner approved a smoother-shaded background edit and its matching portrait adaptation. Only the background artwork changed; layout, copy, Privacy, logo, DNS and hosting remain unchanged. Native source dimensions are 1787×880 desktop and 941×1672 mobile; this is a shading/definition improvement, not a native 4K output or artificial upscale. Generation prompts and original PNGs are recorded in the private `artwork/` source directory, outside the published `docs/` tree.

## Hosting

GitHub Pages source: `main`, `/docs`. `.nojekyll` keeps it static. Do not publish the repository root. Test the GitHub-provided URL before configuring the custom domain. Bind/verify the domain before changing web DNS. Confirm HTTPS and email/DNS preservation after cutover.

Deployment on October 18, 2026: private source repository `lek2d/fitama-website`; approved public artifact commit `8f255d8`; GitHub-generated domain-binding commit `85b18b6`. The GitHub-provided HTTPS URL passed desktop, mobile, small-phone, landscape, text enlargement, keyboard and resource checks before cutover. Domain ownership is verified under `lek2d`; keep the `_github-pages-challenge-lek2d` TXT record.

Web DNS now uses apex A `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` and www CNAME `lek2d.github.io.`, TTL 3600. Authoritative and public DNS checks confirmed these targets. All original non-web GoDaddy DNS rows were compared after the change and preserved, including both MX, SPF, both DKIM selectors, DMARC, autodiscover SRV, domain-connect, NS and SOA.

Secure-domain acceptance completed on October 18, 2026 at 13:59 UTC (21:59 Philippines time). Both apex and www now have a valid Let's Encrypt certificate covering `fitama.app` and `www.fitama.app`. GitHub's DNS check is successful and Enforce HTTPS is checked. Homepage and Privacy return HTTPS 200; www and HTTP requests redirect to `https://fitama.app/`. The complete live browser suite passed all nine check groups without disabling certificate validation. The earlier stage-1 provisioning/hostname-mismatch issue is resolved; the historical investigation is recorded below.

Local check: `python3 -m http.server 8091 --bind 127.0.0.1 --directory docs`. With Playwright and Chrome already available: `node tests/website.browser.cjs`. Set `PLAYWRIGHT_MODULE` to an existing installation if necessary; `FITAMA_COMING_SOON_URL` selects the test URL. No runtime packages, scripts, forms, trackers or external fonts are used by the public page.

## Privacy publication — October 18, 2026

Public policy: `docs/privacy/index.html`, with self-contained `docs/privacy.css`; intended URL `https://fitama.app/privacy/`. It covers the website and iPhone/TestFlight app. Do not copy the old source-audit draft or its Journey/Guide/Terms navigation into this smaller deployment.

Owner confirmed Fredrick Sapanlay as individual operator in the Philippines, using the unregistered Red Pots Games brand, and an initial Philippines audience aged 16+. The owner approved account/game/Health-derived record retention while the account remains active until account deletion, with disclosed backup exceptions, and support emails for up to 12 months after resolution. Planned chat targets remain seven days after the earlier of resolution/expiry for messages, and 30 days after report creation; they are not verified automatic deletion deadlines.

Fredrick handles privacy requests at `support@fitama.app` and owns the support-mail retention commitment. For manual mailbox handling, record an issue's resolution date, review resolved threads regularly, and remove correspondence from active mailbox storage no later than 12 months after resolution, except specific documented legal/security holds. No mailbox automation or email deletion was performed by this website change. Provider backup/log retention is not represented as a known fixed period.

Source reconciliation used the October 18 build 77 release record plus the app's privacy handoff, native AdMob adapter and chat operations evidence. The published notice distinguishes disabled/planned chat, Health-derived backend uploads, shared game totals, non-personalized ad processing, pseudonymous reward verification and GitHub Pages IP logs. Provider links include Supabase's application-data DPA rather than relying solely on its customer Privacy Policy.

Independent content review found no critical/important publication blockers; this is not legal counsel review or a compliance certification. The browser suite checks the real footer-to-policy route, direct nested access, responsive layout, enlarged text, anchors, keyboard skip/home navigation and absence of third-party page requests. Human prose is reviewed against evidence, not validated by string-match tests.

This is website-only. It does not enable chat/ads, deploy cleanup/moderation, change provider settings or fix app/dashboard privacy placeholders. After actual-domain HTTPS is verified, use the public URL in the app, App Store Connect and the correct AdMob consent configuration under their separate task/release authority. Retention and moderation operation, consent, store disclosures and native/two-device acceptance remain activation gates.

Publication evidence: commit `424f671` pushed; Pages workflow #5 succeeded. The policy HTML and CSS served by the GitHub origin over HTTP matched local SHA-256 `72b8a918b1063a19a783de4ed2c590a2b53ed1cd25820b3605a2fc32d4c3467c` and `f8a7570dcbdb3e563c31638b5e98a9ca2d87c6b0ec15691cbe3c8c59e6149dcf`. All nine browser-check groups passed before push, including the newly added nested-policy route and enlarged-text regression. Desktop/mobile captures are local and ignored, not public assets.

HTTPS investigation history: authoritative/public DNS remained correct while validated apex/www HTTPS reported certificate hostname mismatch. Following GitHub's official HTTPS troubleshooting guidance, the same verified custom domain was removed and restored ONCE to restart provisioning; no DNS/email records changed. GitHub created `d5bb31a` / `bbebb17` (Delete/Create CNAME), preserved policy content, and Pages workflow #7 succeeded (#6 was superseded/cancelled). The checker initially alternated DNS outcomes and the certificate remained stage 1 of 3. At 13:55 UTC, normal HTTPS validation began succeeding; Enforce HTTPS was then enabled and verified in the UI. Do not infer that the restart alone caused issuance, and do not repeat rebinds or bypass TLS warnings.

Final acceptance: `https://fitama.app/` and `https://fitama.app/privacy/` returned 200 with normal certificate validation. HTTPS www and HTTP apex/www returned 301 to the HTTPS apex. Live policy HTML/CSS SHA-256 matched the exact shipping hashes above. An independent read-only comparison found every original non-web DNS record unchanged. The first live browser attempt hit its overly short 5-second navigation budget; navigation now gets 30 seconds while element assertions retain 5 seconds. The full live suite then passed desktop, mobile, small phone, landscape, nested Privacy routing/assets, enlarged text, keyboard navigation, home return and no third-party requests/page errors. Fresh screenshots in `.impeccable/review/` are captures of the live HTTPS site, not just localhost.

The public Privacy URL is now usable for the next app/store/AdMob setup task. Those dashboard/app links, consent configuration, ad reward device verification and chat moderation/cleanup activation were not changed by this publication.

Publication rollback: revert the policy-publication commit in this website-only repo and deploy again. This restores the previous static artifact without touching app accounts, backend, email or DNS. Do not delete or reset the app worktree.

## Larger Coming soon heading — October 18, 2026

After approving the smooth background, the owner requested a larger Coming soon heading relative to the logo. The logo size is unchanged. The existing Fredoka 600 heading now scales to 96px at the 1440px desktop check, 46.8px at 390px, and 44px at 320px. At normal text size it remains one line and visibly wider than the logo; enlarged text may wrap rather than clip. The browser suite checks those rendered relationships and 200% text at both 320px and 390px. The stylesheet reference is versioned to refresh cached CSS. No other typography, copy, layout or Privacy styles changed.

## Asset origins

- `docs/assets/logo.png`: original SHA-256 `0ef70b778b6f844f5a9312efb17ff1822a5f43ec04151a8c549a01e548807285`.
- `docs/assets/ending-forest-dungeon.webp`: approved smooth-shading edit of the original desktop forest-footer image. Original SHA-256 `fb9ced755bf9dfabd7e664907bb73aff2298bf380b05fd579b83d9ea4d87e6bd`; current source and encoding are recorded in `artwork/README.md`.
- `docs/assets/ending-forest-dungeon-mobile.webp`: portrait shading adaptation matching the approved desktop. Original SHA-256 `0604db25919f2d1e1b8fc87435fdc287ce11d97a4a778a1ff521fc27025b27b1`; current source and encoding are recorded in `artwork/README.md`.
- `docs/assets/fredoka-semibold.ttf`: existing self-hosted font; redistribution terms in `docs/assets/FONT-LICENSE.txt`.

## Rollback reference

Public authoritative baseline at 2026-10-18 12:30 UTC: apex A `13.248.243.5` and `76.223.105.230`; www CNAME `fitama.app.`; all TTL 3600. No apex AAAA/CAA. Preserve NS `ns37.domaincontrol.com.` and `ns38.domaincontrol.com.`, MX `0 smtp.secureserver.net.` and `10 mailstore1.secureserver.net.`, TXT `v=spf1 include:secureserver.net -all`, and every other non-web record.

Existing apex served an HSTS header. Do not claim completion until HTTPS on the actual domain is verified. DNS propagation and certificate issuance may take time. Restoring web records does not require modifying email or nameservers.
