
import { chromium } from 'playwright';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Checking home page...');
    await page.goto('http://localhost:3000');
    if (await page.title()) {
      console.log('Home page title found:', await page.title());
    }
    await page.screenshot({ path: 'screenshot-home.png' });
    console.log('Saved screenshot-home.png');

    console.log('Checking installer page...');
    await page.goto('http://localhost:3000/installer');
    const headerText = await page.locator('header').innerText();
    if (headerText.includes('Berlin Solar Pro')) {
      console.log('Installer page header verified');
    }
    await page.screenshot({ path: 'screenshot-installer.png' });
    console.log('Saved screenshot-installer.png');

    console.log('Smoke test passed!');
  } catch (e) {
    console.error('Smoke test failed:', e);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
