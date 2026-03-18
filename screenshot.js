const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  
  await page.goto('http://127.0.0.1:7860/skills.html', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: '/Users/rhmnhsim/ouwibo-agent/skills.png' });
  
  await page.goto('http://127.0.0.1:7860/tool.html?tool=dex', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: '/Users/rhmnhsim/ouwibo-agent/tool.png' });
  
  await browser.close();
})();
