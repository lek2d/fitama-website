# FiTama Coming Soon

Website-only static publication. The public site is built solely from `docs/`; the app, backend, account records, source repository history and draft policies are not included.

## Approved scope — October 18, 2026

Owner approved a private website-only repository and web DNS changes for fitama.app. GoDaddy remains the registrar and DNS/email provider. Do not change MX, SPF or nameservers, purchase plans or expose app source. The initial Support-only publication excluded the unfinished Privacy draft. The owner subsequently approved finalizing and publishing Privacy with the retention rules below; the footer now links to it.

Source design: `lek2d/Fitama` branch `codex/onboarding-ui-improvements`, commit `c56c8fa7bc5ac6dda565968ba9cf814e9c9313b7`; the approved Coming Soon adaptation reuses the original forest footer artwork, logo and Fredoka. No new artwork or image edits.

## Hosting

GitHub Pages source: `main`, `/docs`. `.nojekyll` keeps it static. Do not publish the repository root. Test the GitHub-provided URL before configuring the custom domain. Bind/verify the domain before changing web DNS. Confirm HTTPS and email/DNS preservation after cutover.

Deployment on October 18, 2026: private source repository `lek2d/fitama-website`; approved public artifact commit `8f255d8`; GitHub-generated domain-binding commit `85b18b6`. The GitHub-provided HTTPS URL passed desktop, mobile, small-phone, landscape, text enlargement, keyboard and resource checks before cutover. Domain ownership is verified under `lek2d`; keep the `_github-pages-challenge-lek2d` TXT record.

Web DNS now uses apex A `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` and www CNAME `lek2d.github.io.`, TTL 3600. Authoritative and public DNS checks confirmed these targets. All original non-web GoDaddy DNS rows were compared after the change and preserved, including both MX, SPF, both DKIM selectors, DMARC, autodiscover SRV, domain-connect, NS and SOA.

GitHub's DNS validation has alternated between successful and unsuccessful despite correct authoritative and public resolver answers; propagation is not yet settled. At 13:00 UTC, TLS certificate provisioning remained at stage 1 of 3 and validated direct HTTPS still failed the hostname check. Deployment is **not yet HTTPS-ready** until validated connections to both apex and www succeed and Enforce HTTPS can be enabled. Never bypass certificate warnings or treat an old cached GoDaddy response as proof of deployment.

Local check: `python3 -m http.server 8091 --bind 127.0.0.1 --directory docs`. With Playwright and Chrome already available: `node tests/website.browser.cjs`. Set `PLAYWRIGHT_MODULE` to an existing installation if necessary; `FITAMA_COMING_SOON_URL` selects the test URL. No runtime packages, scripts, forms, trackers or external fonts are used by the public page.

## Privacy publication — October 18, 2026

Public policy: `docs/privacy/index.html`, with self-contained `docs/privacy.css`; intended URL `https://fitama.app/privacy/`. It covers the website and iPhone/TestFlight app. Do not copy the old source-audit draft or its Journey/Guide/Terms navigation into this smaller deployment.

Owner confirmed Fredrick Sapanlay as individual operator in the Philippines, using the unregistered Red Pots Games brand, and an initial Philippines audience aged 16+. The owner approved account/game/Health-derived record retention while the account remains active until account deletion, with disclosed backup exceptions, and support emails for up to 12 months after resolution. Planned chat targets remain seven days after the earlier of resolution/expiry for messages, and 30 days after report creation; they are not verified automatic deletion deadlines.

Fredrick handles privacy requests at `support@fitama.app` and owns the support-mail retention commitment. For manual mailbox handling, record an issue's resolution date, review resolved threads regularly, and remove correspondence from active mailbox storage no later than 12 months after resolution, except specific documented legal/security holds. No mailbox automation or email deletion was performed by this website change. Provider backup/log retention is not represented as a known fixed period.

Source reconciliation used the October 18 build 77 release record plus the app's privacy handoff, native AdMob adapter and chat operations evidence. The published notice distinguishes disabled/planned chat, Health-derived backend uploads, shared game totals, non-personalized ad processing, pseudonymous reward verification and GitHub Pages IP logs. Provider links include Supabase's application-data DPA rather than relying solely on its customer Privacy Policy.

Independent content review found no critical/important publication blockers; this is not legal counsel review or a compliance certification. The browser suite checks the real footer-to-policy route, direct nested access, responsive layout, enlarged text, anchors, keyboard skip/home navigation and absence of third-party page requests. Human prose is reviewed against evidence, not validated by string-match tests.

This is website-only. It does not enable chat/ads, deploy cleanup/moderation, change provider settings or fix app/dashboard privacy placeholders. After actual-domain HTTPS is verified, use the public URL in the app, App Store Connect and the correct AdMob consent configuration under their separate task/release authority. Retention and moderation operation, consent, store disclosures and native/two-device acceptance remain activation gates.

Publication evidence: commit `424f671` pushed; Pages workflow #5 succeeded. The policy HTML and CSS served by the GitHub origin over HTTP matched local SHA-256 `72b8a918b1063a19a783de4ed2c590a2b53ed1cd25820b3605a2fc32d4c3467c` and `f8a7570dcbdb3e563c31638b5e98a9ca2d87c6b0ec15691cbe3c8c59e6149dcf`. All nine browser-check groups passed before push, including the newly added nested-policy route and enlarged-text regression. Desktop/mobile captures are local and ignored, not public assets.

HTTPS follow-up: authoritative/public DNS remained correct, but validated apex/www HTTPS still reported certificate hostname mismatch. Following GitHub's official HTTPS troubleshooting guidance, the same verified custom domain was removed and restored ONCE to restart provisioning; no DNS/email records changed. GitHub created `d5bb31a` / `bbebb17` (Delete/Create CNAME), preserved policy content, and Pages workflow #7 succeeded (#6 was superseded/cancelled). The checker still alternated DNS outcomes and the certificate remained stage 1 of 3. Do not repeat rebinds, bypass TLS warnings, enable features or claim the public HTTPS policy URL is ready. Next: recheck issuance and both hostnames; enable Enforce HTTPS when available, then run the browser suite against the real HTTPS domain and confirm byte-identical policy/asset responses. Hosting publication is verified; secure-domain acceptance is still pending.

Publication rollback: revert the policy-publication commit in this website-only repo and deploy again. This restores the previous static artifact without touching app accounts, backend, email or DNS. Do not delete or reset the app worktree.

## Asset origins

- `docs/assets/logo.png`: original SHA-256 `0ef70b778b6f844f5a9312efb17ff1822a5f43ec04151a8c549a01e548807285`.
- `docs/assets/ending-forest-dungeon.webp`: original SHA-256 `fb9ced755bf9dfabd7e664907bb73aff2298bf380b05fd579b83d9ea4d87e6bd`.
- `docs/assets/ending-forest-dungeon-mobile.webp`: original SHA-256 `0604db25919f2d1e1b8fc87435fdc287ce11d97a4a778a1ff521fc27025b27b1`.
- `docs/assets/fredoka-semibold.ttf`: existing self-hosted font; redistribution terms in `docs/assets/FONT-LICENSE.txt`.

## Rollback reference

Public authoritative baseline at 2026-10-18 12:30 UTC: apex A `13.248.243.5` and `76.223.105.230`; www CNAME `fitama.app.`; all TTL 3600. No apex AAAA/CAA. Preserve NS `ns37.domaincontrol.com.` and `ns38.domaincontrol.com.`, MX `0 smtp.secureserver.net.` and `10 mailstore1.secureserver.net.`, TXT `v=spf1 include:secureserver.net -all`, and every other non-web record.

Existing apex served an HSTS header. Do not claim completion until HTTPS on the actual domain is verified. DNS propagation and certificate issuance may take time. Restoring web records does not require modifying email or nameservers.
