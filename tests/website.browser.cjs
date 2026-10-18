const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const targetUrl = process.env.FITAMA_COMING_SOON_URL || 'http://127.0.0.1:8091/';
const repo = path.resolve(__dirname, '..');
const captures = path.join(repo, '.impeccable/review');

(async () => {
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const thirdParty = new Set();
    const failures = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.protocol.startsWith('http') && url.origin !== new URL(targetUrl).origin) thirdParty.add(url.origin);
    });
    page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    page.on('pageerror', error => failures.push(error.message));
    await fs.mkdir(captures, { recursive: true });
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'mobile', width: 390, height: 844 },
      { name: 'small-phone', width: 320, height: 568 },
      { name: 'landscape', width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      const response = await page.goto(targetUrl, { waitUntil: 'load' });
      assert.equal(response.status(), 200, 'Coming Soon must be a real, directly accessible page');
      await page.getByRole('heading', { name: 'Coming soon', exact: true }).waitFor({ state: 'visible' });
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.getByRole('main').count(), 1, 'Page has a single main landmark');
      assert.equal(await page.locator('form, input, iframe, script').count(), 0, 'Coming Soon must not add signup, embeds or scripts');
      const footerLinks = page.getByRole('navigation', { name: 'Footer' });
      assert.equal(await footerLinks.getByRole('link', { name: 'Support', exact: true }).getAttribute('href'), 'mailto:support@fitama.app');
      assert.equal(await footerLinks.getByRole('link').count(), 1, 'Only approved Support is linked until Privacy is final');
      assert.equal(await page.getByRole('main').locator('p').count(), 0, 'The owner requested no supporting sentence');
      const metrics = await page.evaluate(() => {
        const image = document.querySelector('.coming-art img');
        const headline = document.querySelector('h1').getBoundingClientRect();
        const footer = document.querySelector('footer').getBoundingClientRect();
        const links = [...document.querySelectorAll('footer a')].map(a => a.getBoundingClientRect());
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          imageLoaded: image.complete && image.naturalWidth > 0,
          originalArtwork: new URL(image.currentSrc).pathname,
          headlineBottom: headline.bottom,
          footerTop: footer.top,
          validLinks: links.every(r => r.width >= 44 && r.height >= 44),
        };
      });
      assert.equal(metrics.overflow, false, `${viewport.name}: no horizontal scrolling`);
      assert.equal(metrics.imageLoaded, true, `${viewport.name}: original footer artwork must load`);
      assert.ok(metrics.originalArtwork.includes(viewport.width <= 699 ? 'ending-forest-dungeon-mobile.webp' : 'ending-forest-dungeon.webp'));
      assert.ok(metrics.headlineBottom < metrics.footerTop, `${viewport.name}: footer cannot overlap headline`);
      assert.equal(metrics.validLinks, true, `${viewport.name}: footer links have touch targets`);
      if (['desktop', 'mobile'].includes(viewport.name)) await page.screenshot({ path: path.join(captures, `${viewport.name}.png`), fullPage: true });
      console.log(`PASS ${viewport.name}: visible heading, original artwork, accessible links, no overflow`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(targetUrl);
    await page.addStyleTag({ content: 'html{font-size:200% !important}' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Text enlargement must not create horizontal scrolling');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Skip to content');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main', 'Skip link transfers focus to the main content');
    assert.deepEqual([...thirdParty], [], 'No third-party network requests');
    assert.deepEqual(failures, [], 'No failed resources or page errors');
    console.log('PASS text enlargement, keyboard skip link, and no third-party requests/errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
