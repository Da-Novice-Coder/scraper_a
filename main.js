import puppeteer from 'puppeteer';
import { fetchVideoDetails, setRequestInterception } from './helpers/extractInfo.js';
import { randomProxy, userAgent, randomDelay, sleep } from './helpers/utilities.js';

const taskQueue = [];
const failedTasks = [];
const maxRetries = 3;

const scrapeVideos = async () => {
  const baseUrl = 'https://www.xvideos.com/new/';
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080',
    ],
  });

  const page = await browser.newPage();
  const mainPage = await browser.newPage();
  await page.setUserAgent(userAgent());
  await mainPage.setUserAgent(userAgent());
  const script = "Object.defineProperty(navigator, 'webdriver', {get: () => false})"
  page.evaluateOnNewDocument(script);
  await setRequestInterception(page);

  try {
    let firstPage = '1';
    await mainPage.goto(`${baseUrl}${firstPage}/`, { waitUntil: 'networkidle2', timeout: 0 });
    const numberOfPages = await mainPage.$eval('.last-page', (lastpage) => parseInt(lastpage.innerText));
    console.log(`Scraping Page ${1} of ${numberOfPages - 1} Pages`);
    await mainPage.close();

    for (let currentPage = 1; currentPage < numberOfPages; currentPage++) {
      taskQueue.push(`${baseUrl}${currentPage.toString()}/`);
    }

    while (taskQueue.length > 0) {
      const currentTask = taskQueue.shift();
      try {
        await page.goto(currentTask, { waitUntil: 'networkidle2', timeout: 0 });
        const urls = await page.$$eval('.thumb-block .title a', (links) => links.map((link) => link.href));

        for (const url of urls) {
          await fetchVideoDetails(url, browser);
          await sleep(randomDelay(10000, 20000));
        }
      } catch (error) {
        console.error(`Error scraping ${currentTask}: ${error.message}`);
        failedTasks.push({ url: currentTask, retries: 0 });
      }
    }

    // Retry failed tasks
    while (failedTasks.length > 0) {
      const failedTask = failedTasks.shift();
      if (failedTask.retries < maxRetries) {
        try {
          await page.goto(failedTask.url, { waitUntil: 'networkidle2', timeout: 0 });
          const urls = await page.$$eval('.thumb-block .title a', (links) => links.map((link) => link.href));

          for (const url of urls) {
            await fetchVideoDetails(url, browser);
            await sleep(randomDelay(10000, 20000));
          }
        } catch (error) {
          console.error(`Error retrying ${failedTask.url}: ${error.message}`);
          failedTask.retries++;
          failedTasks.push(failedTask);
        }
      } else {
        console.error(`Max retries reached for ${failedTask.url}`);
      }
    }
  } catch (error) {
    console.error(`Error in script execution: ${error.message}`);
  } finally {
    await browser.close();
    console.log('Browser Closed');
  }
};

scrapeVideos();
