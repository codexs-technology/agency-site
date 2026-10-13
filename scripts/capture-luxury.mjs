import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts/luxury',{recursive:true});
const browser = await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome'});
try {
 const page = await browser.newPage();
 for(const [name,path,width,height] of [['home-desktop','/',1440,1000],['home-mobile','/',375,812],['services-desktop','/services',1440,1000],['portfolio-desktop','/portfolio',1440,1000],['contact-desktop','/contact',1440,1000]]) {
  await page.setViewportSize({width,height});
  await page.goto(`http://localhost:8787${path}`);
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('main > section').evaluateAll(nodes=>nodes.forEach(n=>{n.style.contentVisibility='visible';}));
  await page.locator('img').evaluateAll(async images=>Promise.all(images.map(async img=>{img.loading='eager';await img.decode();})));
  await page.screenshot({path:`artifacts/luxury/${name}.png`,fullPage:true,animations:'disabled'});
 }
} finally {await browser.close();}