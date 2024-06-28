import { Cluster } from 'puppeteer-cluster';
import { fetchVideoDetails, setRequestInterception } from './helpers/extractInfo.js';
import { userAgent, randomDelay, sleep } from './helpers/utilities.js';

const baseUrl = 'https://www.xvideos.com/new/';

(async () => {
  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 4,
    puppeteerOptions: {
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ],
    },
    retryLimit: 3,
    monitor: true,
  });

  await cluster.task(async ({ page, data: url }) => {
    await page.setUserAgent(userAgent());
    await setRequestInterception(page);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });
      const urls = await page.$$eval('.thumb-block .title a', (links) => links.map((link) => link.href));
      for (const videoUrl of urls) {
        await fetchVideoDetails(videoUrl, page);
        await sleep(randomDelay(10000, 20000));
      }
    } catch (error) {
      console.error(`Error scraping ${url}: ${error.message}`);
      throw error;
    }
  });

  try {
    const mainPage = await cluster.execute(async ({ page }) => {
      await page.goto(`${baseUrl}1/`, { waitUntil: 'networkidle2', timeout: 0 });
      const numberOfPages = await page.$eval('.last-page', (lastPage) => parseInt(lastPage.innerText));
      return numberOfPages;
    });

    const numberOfPages = await mainPage;
    for (let currentPage = 1; currentPage < numberOfPages; currentPage++) {
      cluster.queue(`${baseUrl}${currentPage.toString()}/`);
    }
  } catch (error) {
    console.error(`Error initializing cluster: ${error.message}`);
  }

  await cluster.idle();
  await cluster.close();
})();
