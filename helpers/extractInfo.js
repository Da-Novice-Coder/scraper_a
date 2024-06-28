import { userAgent } from '../helpers/utilities.js';

export const setRequestInterception = async (page) => {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (['image', 'stylesheet', 'font'].includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });
};

export const fetchVideoDetails = async (url, browser) => {
  const vidPage = await browser.newPage();

  await vidPage.setUserAgent(userAgent());
  const script = "Object.defineProperty(navigator, 'webdriver', {get: () => false})";
  vidPage.evaluateOnNewDocument(script);
  await setRequestInterception(vidPage);

  try {
    await vidPage.goto(url, { waitUntil: 'networkidle2', timeout: 0 });
    const info = await vidPage.evaluate(() => {
      const data = {};
      const div = document.querySelector('#video-player-bg');
      if (!div) return null;
      const text = div.children[5]?.textContent || '';

      const regexMap = {
        title: /html5player\.setVideoTitle\('([^']+)'\);/,
        videoUrlLow: /html5player\.setVideoUrlLow\('([^']+)'\);/,
        videoUrlHigh: /html5player\.setVideoUrlHigh\('([^']+)'\);/,
        videoQuality: /html5player\.setVideoHLS\('([^']+)'\);/,
        uploaderName: /html5player\.setUploaderName\('([^']+)'\);/,
        thumbnailUrl: /html5player\.setThumbUrl169\('([^']+)'\);/,
      };

      for (const key in regexMap) {
        const match = text.match(regexMap[key]);
        data[key] = match ? match[1] : null;
      }

      const metadata = Array.from(document.querySelectorAll('.video-metadata > ul li.model'));
      const pornstars = metadata.map((li) => li.querySelector('a').href.split('/')[4]);

      const tags = Array.from(document.querySelectorAll('.is-keyword')).map((el) => el.innerText);
      const duration = document.querySelector('.duration')?.textContent || '';
      const views = document.querySelector('#v-views .mobile-hide')?.textContent || '';
      const comments = document.querySelector('.comments .badge')?.textContent || '';

      return { ...data, pornstars, duration, views, comments, tags };
    });

    if (info) {
      console.log(info);
    }
  } catch (error) {
    console.error(`Error fetching video details for ${url}: ${error.message}`);
  } finally {
    await vidPage.close();
  }
};
