import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const result = await page.evaluate(() => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = '<mml:math><mml:mfrac><mml:mi>b</mml:mi><mml:mn>2</mml:mn></mml:mfrac></mml:math>';
    return tempDiv.innerHTML;
  });
  console.log(result);
  await browser.close();
})();
