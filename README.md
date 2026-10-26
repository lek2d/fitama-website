# FiTama website

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
