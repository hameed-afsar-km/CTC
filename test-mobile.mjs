import { chromium } from 'playwright';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.waitForTimeout(6000);
await page.screenshot({ path: 'D:/CTC/CTC/test-mobile.png', fullPage: true });
console.log('screenshot done');
await browser.close();
