import { chromium } from '@playwright/test';
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL} : {});
try {
  const page = await browser.newPage({viewport:{width:1200,height:630}});
  await page.setContent(`<html><style>*{box-sizing:border-box}body{margin:0;background:#0b0a09;color:#f5f2ec;font-family:Arial,sans-serif;padding:70px}.brand{font-size:25px;letter-spacing:-1px}.index{color:#c5a46d;font-size:12px;letter-spacing:3px;margin:50px 0 25px}h1{font-size:102px;letter-spacing:-7px;line-height:.95;font-weight:500;margin:0}em{color:#c5a46d;font-family:Georgia,serif;font-weight:400}p{color:#a9a39a;margin-top:35px;font-size:20px}</style><body><div class="brand">CodesBoxs.</div><div class="index">SOFTWARE / AI / DIGITAL EXPERIENCES</div><h1>WE ENGINEER<br>WHAT’S <em>NEXT.</em></h1><p>Intelligent software. Exceptional digital experiences.</p></body></html>`);
  await page.screenshot({path:'public/images/social-preview.png'});
} finally { await browser.close(); }