// puppeteer-config.js
const puppeteer = require('puppeteer');

async function configurePuppeteer() {
  const browser = await puppeteer.launch({ headless: true });
  global.__BROWSER__ = browser;
}

configurePuppeteer();
