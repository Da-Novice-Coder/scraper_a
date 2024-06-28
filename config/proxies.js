import { readFileSync } from 'node:fs';

function* proxyGenerator(proxies) {
  let index = 0;
  while (true) {
    if (index < proxies.length) {
      yield proxies[index];
      index++;
    } else {
      index = 0;
      yield proxies[index];
      index++;
    }
  }
}

function loadProxies(filePath) {
  try {
    const data = readFileSync(filePath, 'utf8');
    return data.split('\n').map((ip) => ip.replace('\r', ''));
  } catch (err) {
    console.error('Error reading proxies file:', err);
    return [];
  }
}

const proxyList = loadProxies('./config/proxies.txt');
export const generateProxy = proxyGenerator(proxyList);
