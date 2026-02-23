const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle', timeout: 10000 });
    
    const passwordInput = await page.locator('input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Logging in...');
      await passwordInput.fill('arachne-dev-2026');
      await page.press('input[type="password"]', 'Enter');
      await page.waitForURL('**/chat', { timeout: 10000 });
    }
    
    console.log('Navigating to chat page...');
    await page.goto('http://localhost:3000/chat', { waitUntil: 'domcontentloaded', timeout: 10000 });

    console.log('Waiting for chat input...');
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 15000 });
    console.log('Chat page loaded');
    
    await page.waitForTimeout(2000);
    
    const url = page.url();
    console.log('Current URL:', url);
    
    if (!url.includes('session=')) {
      console.log('No session in URL, waiting for auto-creation or clicking new chat...');
      await page.waitForTimeout(2000);
      
      const newUrl = page.url();
      if (!newUrl.includes('session=')) {
        console.log('Still no session, looking for new chat button...');
        const newChatButton = page.locator('button:has-text("New Chat")').first();
        if (await newChatButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await newChatButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }
    
    console.log('Final URL:', page.url());

    const testMessage = 'Tell me about quantum computing in great detail';
    console.log(`Typing message: "${testMessage}"`);
    await page.fill('[data-testid="chat-input"]', testMessage);
    
    console.log('Setting up thinking indicator check...');
    const thinkingIndicator = page.locator('text=Arachne is thinking...').first();
    
    console.log('Submitting message...');
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForTimeout(200);
    
    const messageListHTML = await page.locator('[data-testid="message-list"]').innerHTML();
    console.log('Message list HTML after send (first 800 chars):', messageListHTML.substring(0, 800));
    console.log('Contains "thinking":', messageListHTML.includes('thinking'));
    console.log('Contains "Arachne":', messageListHTML.includes('Arachne'));

    console.log('Checking for thinking indicator...');
    const isVisible = await thinkingIndicator.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isVisible) {
      console.log('✓ Thinking indicator appeared!');
      
      // Take screenshot with thinking indicator
      await page.screenshot({ 
        path: '.sisyphus/evidence/task-4-thinking-indicator.png',
        fullPage: true 
      });
      console.log('✓ Screenshot saved: .sisyphus/evidence/task-4-thinking-indicator.png');

      // Wait for the thinking indicator to disappear (response starts streaming)
      console.log('Waiting for thinking indicator to disappear...');
      await thinkingIndicator.waitFor({ state: 'hidden', timeout: 30000 });
      console.log('✓ Thinking indicator disappeared (streaming started)');
      
      // Take screenshot after streaming starts
      await page.screenshot({ 
        path: '.sisyphus/evidence/task-4-streaming-started.png',
        fullPage: true 
      });
      console.log('✓ Screenshot saved: .sisyphus/evidence/task-4-streaming-started.png');
    } else {
      console.log('✗ Thinking indicator did NOT appear');
      await page.screenshot({ 
        path: '.sisyphus/evidence/task-4-no-indicator.png',
        fullPage: true 
      });
      process.exit(1);
    }

    console.log('\n✓ All checks passed!');
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ 
      path: '.sisyphus/evidence/task-4-error.png',
      fullPage: true 
    });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
