const { chromium } = require('playwright');
const path = require('path');

async function testPluginManager() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen for console errors and logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser error:', msg.text());
    } else if (msg.type() === 'log') {
      console.log('Browser log:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('Page error:', error.message);
  });
  
  // Navigate to the application
  const indexPath = path.join(__dirname, '..', 'index.html');
  await page.goto(`file://${indexPath}`);
  
  // Wait for the app to load - wait for tray elements to appear
  await page.waitForSelector('.tray, [data-tray-id]', { timeout: 10000 });
  
  console.log('✓ App loaded successfully');
  
  // Check if hamburger menu exists
  const hamburgerExists = await page.isVisible('.hamburger-menu');
  console.log('Hamburger menu visible:', hamburgerExists);
  
  // Try to find and click the hamburger button
  const hamburgerButton = await page.$('.hamburger-menu');
  if (hamburgerButton) {
    console.log('✓ Found hamburger button');
    await hamburgerButton.click();
    console.log('✓ Clicked hamburger button');
    
    // Wait for menu to appear
    await page.waitForTimeout(500);
    
    // Look for plugin manager option
    const pluginManagerOption = await page.$('[data-action="pluginManager"]');
    if (pluginManagerOption) {
      console.log('✓ Found Plugin Manager option');
      await pluginManagerOption.click();
      console.log('✓ Clicked Plugin Manager option');
      
      // Wait for plugin manager dialog
      await page.waitForTimeout(2000);
      
      // Check if plugin manager dialog appeared
      const dialogExists = await page.isVisible('.plugin-manager-dialog');
      console.log('Plugin Manager dialog visible:', dialogExists);
      
      // Also check if any dialogs exist
      const anyDialog = await page.$('.plugin-manager-dialog');
      console.log('Dialog element found:', !!anyDialog);
      
      // Try to find by content
      const dialogByContent = await page.$('text=Plugin Manager');
      console.log('Dialog found by text:', !!dialogByContent);
      
      if (dialogByContent) {
        const dialogInfo = await dialogByContent.evaluate(el => ({
          tagName: el.tagName,
          className: el.className,
          style: el.style.cssText,
          display: getComputedStyle(el).display,
          visibility: getComputedStyle(el).visibility,
          zIndex: getComputedStyle(el).zIndex
        }));
        console.log('Dialog info:', dialogInfo);
      }
      
      // Check all elements on page for debugging
      const allElements = await page.$$eval('*', elements => 
        elements.map(el => el.tagName + (el.className ? '.' + el.className.replace(/\s+/g, '.') : '') + (el.id ? '#' + el.id : '')).slice(-20)
      );
      console.log('Recent elements on page:', allElements);
      
      if (dialogExists) {
        console.log('✓ Plugin Manager dialog opened successfully');
      } else {
        console.log('✗ Plugin Manager dialog did not appear');
        
        // Take screenshot for debugging
        await page.screenshot({ path: 'plugin-manager-debug.png' });
        console.log('Debug screenshot saved to plugin-manager-debug.png');
      }
    } else {
      console.log('✗ Plugin Manager option not found in menu');
      
      // Log all menu items for debugging
      const menuItems = await page.$$eval('[role="menuitem"], .menu-item, li', elements => 
        elements.map(el => el.textContent?.trim()).filter(Boolean)
      );
      console.log('Available menu items:', menuItems);
    }
  } else {
    console.log('✗ Hamburger button not found');
    
    // Try to find any clickable elements that might open menu
    const possibleButtons = await page.$$('button, [role="button"], .clickable');
    console.log(`Found ${possibleButtons.length} possible buttons`);
    
    for (let i = 0; i < Math.min(possibleButtons.length, 5); i++) {
      const buttonText = await possibleButtons[i].textContent();
      console.log(`Button ${i + 1}: "${buttonText?.trim()}"`);
    }
  }
  
  // Wait briefly for any async operations
  await page.waitForTimeout(1000);
  
  await browser.close();
}

testPluginManager().catch(console.error);