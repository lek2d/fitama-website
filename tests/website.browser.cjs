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
    page.setDefaultTimeout(5000);
    page.setDefaultNavigationTimeout(30000);
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
      assert.equal(await footerLinks.getByRole('link', { name: 'Privacy', exact: true }).getAttribute('href'), 'privacy/');
      assert.equal(await footerLinks.getByRole('link').count(), 2, 'Footer exposes the published policy and Support');
      assert.equal(await page.getByRole('main').locator('p').count(), 0, 'The owner requested no supporting sentence');
      const metrics = await page.evaluate(() => {
        const image = document.querySelector('.coming-art img');
        const heading = document.querySelector('h1');
        const headline = heading.getBoundingClientRect();
        const headlineRange = document.createRange();
        headlineRange.selectNodeContents(heading);
        const headlineText = headlineRange.getBoundingClientRect();
        const brand = document.querySelector('.brand').getBoundingClientRect();
        const footer = document.querySelector('footer').getBoundingClientRect();
        const links = [...document.querySelectorAll('footer a')].map(a => a.getBoundingClientRect());
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          imageLoaded: image.complete && image.naturalWidth > 0,
          artwork: new URL(image.currentSrc).pathname,
          headlineBottom: headline.bottom,
          headlineTextWidth: headlineText.width,
          headlineTextHeight: headlineText.height,
          headlineLineHeight: parseFloat(getComputedStyle(heading).lineHeight),
          brandWidth: brand.width,
          footerTop: footer.top,
          validLinks: links.every(r => r.width >= 44 && r.height >= 44),
        };
      });
      assert.equal(metrics.overflow, false, `${viewport.name}: no horizontal scrolling`);
      assert.equal(metrics.imageLoaded, true, `${viewport.name}: approved footer artwork must load`);
      assert.ok(metrics.artwork.includes(viewport.width <= 699 ? 'ending-forest-dungeon-mobile.webp' : 'ending-forest-dungeon.webp'));
      assert.ok(metrics.headlineBottom < metrics.footerTop, `${viewport.name}: footer cannot overlap headline`);
      assert.ok(metrics.headlineTextWidth > metrics.brandWidth, `${viewport.name}: Coming soon is visually wider than the logo`);
      assert.ok(metrics.headlineTextHeight < metrics.headlineLineHeight * 1.5, `${viewport.name}: Coming soon fits on one line at the normal text size`);
      assert.equal(metrics.validLinks, true, `${viewport.name}: footer links have touch targets`);
      if (['desktop', 'mobile'].includes(viewport.name)) await page.screenshot({ path: path.join(captures, `${viewport.name}.png`), fullPage: true });
      console.log(`PASS ${viewport.name}: visible heading, approved artwork, accessible links, no overflow`);
    }
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto(targetUrl);
      await page.addStyleTag({ content: 'html{font-size:200% !important}' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${viewport.width}px: text enlargement must not create horizontal scrolling`);
    }
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Skip to content');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main', 'Skip link transfers focus to the main content');

    await page.goto(targetUrl);
    await page.getByRole('navigation', { name: 'Footer' }).getByRole('link', { name: 'Privacy', exact: true }).click();
    assert.equal(new URL(page.url()).pathname, new URL('privacy/', targetUrl).pathname, 'Footer opens the real nested policy route');
    await page.getByRole('heading', { name: 'Privacy Policy', exact: true }).waitFor({ state: 'visible' });
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'mobile', width: 390, height: 844 },
      { name: 'small-phone', width: 320, height: 568 },
    ]) {
      await page.setViewportSize(viewport);
      const response = await page.goto(new URL('privacy/', targetUrl).href, { waitUntil: 'load' });
      assert.equal(response.status(), 200, 'Privacy is publicly reachable without login');
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.getByRole('main').count(), 1);
      assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
      assert.equal(await page.locator('form, input, iframe, script').count(), 0, 'Policy does not add tracking or data collection UI');
      const documentMetrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        unreadableImages: [...document.images].some(img => !img.complete || !img.naturalWidth),
        missingAnchors: [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(href => !document.getElementById(decodeURIComponent(href.slice(1))))
      }));
      assert.equal(documentMetrics.overflow, false, `${viewport.name}: policy has no horizontal scrolling`);
      assert.equal(documentMetrics.unreadableImages, false, 'Policy brand loads from its nested route');
      assert.deepEqual(documentMetrics.missingAnchors, [], 'Contents and skip links target existing sections');
      if (viewport.name !== 'small-phone') await page.screenshot({ path: path.join(captures, `privacy-${viewport.name}.png`), fullPage: false });
      console.log(`PASS privacy ${viewport.name}: direct route, landmarks, nested assets and contents anchors`);
    }
    await page.addStyleTag({ content: 'html{font-size:200% !important}' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Policy remains readable with enlarged text');
    await page.getByRole('link', { name: 'How long we keep information', exact: true }).click();
    assert.equal(new URL(page.url()).hash, '#retention', 'Contents navigation reaches retention information');
    await page.goto(new URL('privacy/', targetUrl).href);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Skip to content');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main', 'Policy skip link transfers keyboard focus');
    await page.getByRole('link', { name: 'FiTama home', exact: true }).click();
    await page.getByRole('heading', { name: 'Coming soon', exact: true }).waitFor({ state: 'visible' });
    console.log('PASS policy navigation, text enlargement, keyboard access and return home');
    assert.deepEqual([...thirdParty], [], 'No third-party network requests');
    assert.deepEqual(failures, [], 'No failed resources or page errors');
    console.log('PASS text enlargement, keyboard skip link, and no third-party requests/errors');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
