const fs = require('fs');
const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse/lighthouse-core/fraggle-rock/api.js');

//================================UTILTIES================================
const waitTillHTMLRendered = async (page, timeout = 30000) => {
  const checkDurationMsecs = 1000;
  const maxChecks = timeout / checkDurationMsecs;
  let lastHTMLSize = 0;
  let checkCounts = 1;
  let countStableSizeIterations = 0;
  const minStableSizeIterations = 3;

  while (checkCounts++ <= maxChecks) {
    let html = await page.content();
    let currentHTMLSize = html.length;

    let bodyHTMLSize = await page.evaluate(
      () => document.body.innerHTML.length
    );

    //console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);

    if (lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize)
      countStableSizeIterations++;
    else countStableSizeIterations = 0; //reset the counter

    if (countStableSizeIterations >= minStableSizeIterations) {
      console.log('Fully Rendered Page: ' + page.url());
      break;
    }

    lastHTMLSize = currentHTMLSize;
    await page.waitForTimeout(checkDurationMsecs);
  }
};

async function waitAndPerformAction(page, locator, action, data) {
  if (action == 'click') {
    await page.waitForXPath(locator);
    const element = await page.$x(locator);
    await element[0].click();
  } else if (action == 'type') {
    await page.waitForXPath(locator);
    const element = await page.$x(locator);
    await element[0].type(data);
  }
}

async function captureReport() {
  const browser = await puppeteer.launch({
    args: [
      '--allow-no-sandbox-job',
      '--allow-sandbox-debugging',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-gpu-sandbox',
      '--display',
      '--ignore-certificate-errors',
      '--disable-storage-reset=true',
    ],
  });
  //const browser = await puppeteer.launch({"headless": false, args: ['--allow-no-sandbox-job', '--allow-sandbox-debugging', '--no-sandbox', '--ignore-certificate-errors', '--disable-storage-reset=true']});
  const page = await browser.newPage();
  const baseURL = 'http://localhost/';

  await page.setViewport({ width: 1920, height: 1080 });
  await page.setDefaultTimeout(10000);

  const navigationPromise = page.waitForNavigation({
    timeout: 30000,
    waitUntil: ['domcontentloaded'],
  });
  await page.goto(baseURL);
  await navigationPromise;

  const flow = await lighthouse.startFlow(page, {
    name: 'demoblaze',
    configContext: {
      settingsOverrides: {
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
        throttlingMethod: 'simulate',
        screenEmulation: {
          mobile: false,
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
          disabled: false,
        },
        formFactor: 'desktop',
        onlyCategories: ['performance'],
      },
    },
  });

  //================================NAVIGATE================================
  await flow.navigate(baseURL, {
    stepName: 'open main page',
  });
  console.log('main page is opened');
  await waitTillHTMLRendered(page);

  const companyName = 'ABC Corporation';
  const fullName = 'John Oliver';
  const address = '441 Test Street Test Lane';
  const postalCode = '1222012';
  const CityName = 'Albama';
  const country = 'AF';
  const phone = '1234567891';
  const email = 'test@mail.com';

  //================================SELECTORS================================

  const tableTab = "//a[contains(@href,'tables-2')]/img";
  const tableProduct = "//a[contains(@href,'room-table8')]/img";
  const AddToCartBtn = '.button.green-box';
  const openCartBtn = "//a[text()='See your cart']";
  const placeOrderBtn = "//input[@value='Place an order']";
  const companyNameField = "//input[@name='cart_company']";
  const fullNameField = "//input[@name='cart_name']";
  const addressField = "//input[@name='cart_address']";
  const postalField = "//input[@name='cart_postal']";
  const cityField = "//input[@name='cart_city']";
  const countryDropdown = "select[name='cart_country']";
  const phoneField = "//input[@name='cart_phone']";
  const emailField = "//input[@name='cart_email']";
  const completeOrderBtn = "//input[@name='cart_submit']";
  const thanksMsg = '.entry-title';

  // ================================PAGE_ACTIONS================================

  await flow.startTimespan({ stepName: 'table tab' });
  await waitAndPerformAction(page, tableTab, 'click');
  await flow.endTimespan();
  console.log('table tab navigation is completed');

  await navigationPromise;
  await flow.startTimespan({ stepName: 'product page-table' });

  await waitAndPerformAction(page, tableProduct, 'click');
  await flow.endTimespan();
  console.log('product page navigation is completed');

  await navigationPromise;
  await page.waitForSelector(AddToCartBtn);
  await page.click(AddToCartBtn);
  await navigationPromise;

  await flow.startTimespan({ stepName: 'open cart page' });
  await waitAndPerformAction(page, openCartBtn, 'click');
  await flow.endTimespan();
  console.log('cart page navigation is completed');
  await navigationPromise;

  await flow.startTimespan({ stepName: 'Checkout page' });
  await waitAndPerformAction(page, placeOrderBtn, 'click');
  await flow.endTimespan();
  console.log('Checkout navigation is completed');

  await navigationPromise;
  await waitAndPerformAction(page, companyNameField, 'type', companyName);
  await waitAndPerformAction(page, fullNameField, 'type', fullName);
  await waitAndPerformAction(page, addressField, 'type', address);
  await waitAndPerformAction(page, postalField, 'type', postalCode);
  await waitAndPerformAction(page, cityField, 'type', CityName);
  await page.select(countryDropdown, country);
  await waitAndPerformAction(page, phoneField, 'type', phone);
  await waitAndPerformAction(page, emailField, 'type', email);

  await flow.startTimespan({ stepName: 'Complete order page' });
  await waitAndPerformAction(page, completeOrderBtn, 'click');
  await navigationPromise;
  await page.waitForSelector(thanksMsg);
  await flow.endTimespan();
  console.log('placing order is completed');

  //================================REPORTING================================
  const reportPath = __dirname + '/user-flow.report.html';
  //const reportPathJson = __dirname + '/user-flow.report.json';

  const report = await flow.generateReport();
  //const reportJson = JSON.stringify(flow.getFlowResult()).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

  fs.writeFileSync(reportPath, report);
  //fs.writeFileSync(reportPathJson, reportJson);

  await browser.close();
}
captureReport();
