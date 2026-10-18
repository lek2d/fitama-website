# FiTama Coming Soon

Website-only static publication. The public site is built solely from `docs/`; the app, backend, account records, source repository history and draft policies are not included.

## Approved scope — October 18, 2026

Owner approved a private website-only repository and web DNS changes for fitama.app. GoDaddy remains the registrar and DNS/email provider. Do not change MX, SPF or nameservers, purchase plans, expose app source or publish the Privacy draft. Support is the only live footer link until the policy is finalized.

Source design: `lek2d/Fitama` branch `codex/onboarding-ui-improvements`, commit `c56c8fa7bc5ac6dda565968ba9cf814e9c9313b7`; the approved Coming Soon adaptation reuses the original forest footer artwork, logo and Fredoka. No new artwork or image edits.

## Hosting

GitHub Pages source: `main`, `/docs`. `.nojekyll` keeps it static. Do not publish the repository root. Test the GitHub-provided URL before configuring the custom domain. Bind/verify the domain before changing web DNS. Confirm HTTPS and email/DNS preservation after cutover.

Local check: `python3 -m http.server 8091 --bind 127.0.0.1 --directory docs`. With Playwright and Chrome already available: `node tests/website.browser.cjs`. Set `PLAYWRIGHT_MODULE` to an existing installation if necessary; `FITAMA_COMING_SOON_URL` selects the test URL. No runtime packages, scripts, forms, trackers or external fonts are used by the public page.

## Asset origins

- `docs/assets/logo.png`: original SHA-256 `0ef70b778b6f844f5a9312efb17ff1822a5f43ec04151a8c549a01e548807285`.
- `docs/assets/ending-forest-dungeon.webp`: original SHA-256 `fb9ced755bf9dfabd7e664907bb73aff2298bf380b05fd579b83d9ea4d87e6bd`.
- `docs/assets/ending-forest-dungeon-mobile.webp`: original SHA-256 `0604db25919f2d1e1b8fc87435fdc287ce11d97a4a778a1ff521fc27025b27b1`.
- `docs/assets/fredoka-semibold.ttf`: existing self-hosted font; redistribution terms in `docs/assets/FONT-LICENSE.txt`.

## Rollback reference

Public authoritative baseline at 2026-10-18 12:30 UTC: apex A `13.248.243.5` and `76.223.105.230`; www CNAME `fitama.app.`; all TTL 3600. No apex AAAA/CAA. Preserve NS `ns37.domaincontrol.com.` and `ns38.domaincontrol.com.`, MX `0 smtp.secureserver.net.` and `10 mailstore1.secureserver.net.`, TXT `v=spf1 include:secureserver.net -all`, and every other non-web record.

Existing apex served an HSTS header. Do not claim completion until HTTPS on the actual domain is verified. DNS propagation and certificate issuance may take time. Restoring web records does not require modifying email or nameservers.
