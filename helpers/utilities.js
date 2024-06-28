import { generateProxy } from '../config/proxies.js';
import { generateAgent } from '../config/userAgents.js';

export const proxy = () => generateProxy.next().value;
export const userAgent = () => generateAgent.next().value;
export const randomProxy = () => proxies[Math.floor(Math.random() * proxies.length)];
export const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
