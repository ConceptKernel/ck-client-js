/**
 * Playwright test to debug page reload issue in chat.html
 *
 * This test:
 * 1. Opens chat.html in a real browser
 * 2. Captures console logs and errors
 * 3. Performs the full flow: Connect → Authenticate → Send
 * 4. Detects if/when page reloads
 * 5. Reports detailed diagnostics
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Chat.html Browser Debugging', () => {
  let consoleLogs = [];
  let consoleErrors = [];
  let pageReloaded = false;
  let reloadTime = null;

  test.beforeEach(async ({ page }) => {
    // Reset tracking variables
    consoleLogs = [];
    consoleErrors = [];
    pageReloaded = false;
    reloadTime = null;

    // Capture console messages
    page.on('console', msg => {
      const text = msg.text();
      const timestamp = new Date().toISOString();

      consoleLogs.push({ timestamp, type: msg.type(), text });

      console.log(`[${timestamp}] [${msg.type()}] ${text}`);

      if (msg.type() === 'error') {
        consoleErrors.push({ timestamp, text });
      }
    });

    // Detect page load events (reload detection)
    let loadCount = 0;
    page.on('load', () => {
      loadCount++;
      const timestamp = new Date().toISOString();

      if (loadCount > 1) {
        pageReloaded = true;
        reloadTime = timestamp;
        console.log(`\n⚠️  PAGE RELOADED at ${timestamp}\n`);
      } else {
        console.log(`\n✓ Initial page load at ${timestamp}\n`);
      }
    });

    // Capture uncaught exceptions
    page.on('pageerror', error => {
      const timestamp = new Date().toISOString();
      console.error(`\n❌ UNCAUGHT EXCEPTION at ${timestamp}:`, error.message);
      consoleErrors.push({ timestamp, text: `UNCAUGHT: ${error.message}` });
    });

    // Capture network errors
    page.on('requestfailed', request => {
      const timestamp = new Date().toISOString();
      console.error(`\n❌ REQUEST FAILED at ${timestamp}:`, request.url(), request.failure().errorText);
    });
  });

  test('should complete full flow without page reload', async ({ page }) => {
    const chatHtmlPath = path.resolve(__dirname, '../examples/chat.html');
    const fileUrl = `file://${chatHtmlPath}`;

    console.log(`\n🚀 Opening: ${fileUrl}\n`);

    // Navigate to chat.html
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });

    // Wait for page to be fully loaded
    await page.waitForTimeout(1000);

    console.log('✓ Page loaded\n');

    // Step 1: Connect to gateway
    console.log('📡 Step 1: Clicking Connect button...');
    await page.click('#btn-connect');

    // Wait for connection to establish
    await page.waitForTimeout(3000);

    // Check if page reloaded after connect
    if (pageReloaded) {
      console.error(`\n❌ PAGE RELOADED AFTER CONNECT at ${reloadTime}\n`);
      console.log('Console logs before reload:', JSON.stringify(consoleLogs, null, 2));
      throw new Error('Page reloaded unexpectedly after Connect');
    }

    console.log('✓ Connected (no reload)\n');

    // Step 2: Authenticate
    console.log('🔐 Step 2: Clicking Authenticate button...');
    await page.click('#btn-auth');

    // Wait for authentication
    await page.waitForTimeout(2000);

    // Check if page reloaded after auth
    if (pageReloaded) {
      console.error(`\n❌ PAGE RELOADED AFTER AUTH at ${reloadTime}\n`);
      console.log('Console logs before reload:', JSON.stringify(consoleLogs, null, 2));
      throw new Error('Page reloaded unexpectedly after Authenticate');
    }

    console.log('✓ Authenticated (no reload)\n');

    // Step 3: Send message
    console.log('💬 Step 3: Clicking Send button...');

    // Ensure input has content
    const messageInput = await page.locator('#message-input');
    const currentValue = await messageInput.inputValue();
    console.log(`Message input value: ${currentValue}`);

    // Click send
    await page.click('#btn-send');

    console.log('✓ Send button clicked, waiting for response...\n');

    // Wait for response (longer timeout to capture the issue)
    await page.waitForTimeout(5000);

    // Check if page reloaded after send
    if (pageReloaded) {
      console.error(`\n❌ PAGE RELOADED AFTER SEND at ${reloadTime}\n`);
      console.log('\n📋 Console logs before reload:');
      consoleLogs.forEach(log => {
        console.log(`  [${log.timestamp}] [${log.type}] ${log.text}`);
      });

      console.log('\n❌ Console errors:');
      if (consoleErrors.length > 0) {
        consoleErrors.forEach(err => {
          console.log(`  [${err.timestamp}] ${err.text}`);
        });
      } else {
        console.log('  (no errors captured)');
      }

      throw new Error('Page reloaded unexpectedly after Send');
    }

    console.log('✓ Message sent successfully (no reload)\n');

    // Final summary
    console.log('\n📊 TEST SUMMARY:');
    console.log(`Total console logs: ${consoleLogs.length}`);
    console.log(`Total console errors: ${consoleErrors.length}`);
    console.log(`Page reloaded: ${pageReloaded}`);

    // Display last 10 console logs
    console.log('\n📋 Last 10 console logs:');
    consoleLogs.slice(-10).forEach(log => {
      console.log(`  [${log.timestamp}] [${log.type}] ${log.text}`);
    });

    // If no reload, test passes
    expect(pageReloaded).toBe(false);
  });

  test('should identify what triggers reload if it occurs', async ({ page }) => {
    const chatHtmlPath = path.resolve(__dirname, '../examples/chat.html');
    const fileUrl = `file://${chatHtmlPath}`;

    console.log(`\n🔍 DIAGNOSTIC MODE: ${fileUrl}\n`);

    // Navigate
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Inject monitoring script BEFORE any actions
    await page.evaluate(() => {
      // Monitor all navigation attempts
      const originalAssign = window.location.assign;
      const originalReplace = window.location.replace;
      const originalReload = window.location.reload;

      window.location.assign = function(...args) {
        console.error('NAVIGATION DETECTED: location.assign called with', args);
        return originalAssign.apply(this, args);
      };

      window.location.replace = function(...args) {
        console.error('NAVIGATION DETECTED: location.replace called with', args);
        return originalReplace.apply(this, args);
      };

      window.location.reload = function(...args) {
        console.error('NAVIGATION DETECTED: location.reload called');
        return originalReload.apply(this, args);
      };

      // Monitor form submissions
      document.addEventListener('submit', (e) => {
        console.error('FORM SUBMIT DETECTED:', e.target);
      }, true);

      // Monitor unhandled promise rejections
      window.addEventListener('unhandledrejection', (e) => {
        console.error('UNHANDLED PROMISE REJECTION:', e.reason);
      });

      console.log('✓ Navigation monitoring injected');
    });

    // Now perform the full flow
    console.log('📡 Connecting...');
    await page.click('#btn-connect');
    await page.waitForTimeout(3000);

    console.log('🔐 Authenticating...');
    await page.click('#btn-auth');
    await page.waitForTimeout(2000);

    console.log('💬 Sending message...');
    await page.click('#btn-send');
    await page.waitForTimeout(5000);

    // Report findings
    console.log('\n📊 DIAGNOSTIC RESULTS:');
    console.log(`Page reloaded: ${pageReloaded}`);
    console.log(`Total console logs: ${consoleLogs.length}`);
    console.log(`Total console errors: ${consoleErrors.length}`);

    if (pageReloaded) {
      console.log(`\n⚠️  Reload occurred at: ${reloadTime}`);
      console.log('\n📋 Events leading up to reload:');

      // Find logs near reload time
      const reloadTimestamp = new Date(reloadTime).getTime();
      const relevantLogs = consoleLogs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        return Math.abs(logTime - reloadTimestamp) < 2000; // Within 2 seconds
      });

      relevantLogs.forEach(log => {
        console.log(`  [${log.timestamp}] [${log.type}] ${log.text}`);
      });
    }
  });

  test('should test with page reload between runs (cached state simulation)', async ({ page }) => {
    const chatHtmlPath = path.resolve(__dirname, '../examples/chat.html');
    const fileUrl = `file://${chatHtmlPath}`;

    console.log(`\n🔄 CACHE SIMULATION MODE: ${fileUrl}\n`);
    console.log('This test simulates regular browser behavior with cached state\n');

    // Helper function to perform the full flow
    async function performFullFlow(runNumber) {
      console.log(`\n========== RUN ${runNumber} ==========\n`);

      // Inject monitoring before actions
      await page.evaluate(() => {
        window._testRunMonitoring = window._testRunMonitoring || {};
        window._testRunMonitoring.navigationAttempts = [];

        if (!window._testRunMonitoring.monitorsInstalled) {
          const originalReload = window.location.reload;
          window.location.reload = function(...args) {
            console.error('🔄 RELOAD CALLED');
            window._testRunMonitoring.navigationAttempts.push({ type: 'reload', timestamp: Date.now() });
            return originalReload.apply(this, args);
          };

          window.addEventListener('unhandledrejection', (e) => {
            console.error('❌ UNHANDLED REJECTION:', e.reason);
          });

          window._testRunMonitoring.monitorsInstalled = true;
        }
      });

      // Connect
      console.log('📡 Connecting...');
      await page.click('#btn-connect');
      await page.waitForTimeout(3000);

      const statusAfterConnect = await page.locator('#status-text').textContent();
      console.log(`   Status: ${statusAfterConnect}`);

      // Authenticate
      console.log('🔐 Authenticating...');
      await page.click('#btn-auth');
      await page.waitForTimeout(2000);

      const statusAfterAuth = await page.locator('#status-text').textContent();
      console.log(`   Status: ${statusAfterAuth}`);

      // Send message
      console.log('💬 Sending message...');
      const sendButtonEnabled = await page.locator('#btn-send').isEnabled();
      console.log(`   Send button enabled: ${sendButtonEnabled}`);

      await page.click('#btn-send');
      console.log('   Clicked send, waiting for response...');

      // Wait and watch for reload
      await page.waitForTimeout(5000);

      // Check if any navigation was attempted
      const navAttempts = await page.evaluate(() => {
        return window._testRunMonitoring?.navigationAttempts || [];
      });

      if (navAttempts.length > 0) {
        console.log('\n⚠️  NAVIGATION ATTEMPTS DETECTED:');
        navAttempts.forEach(attempt => {
          console.log(`   ${attempt.type} at ${new Date(attempt.timestamp).toISOString()}`);
        });
      } else {
        console.log('✓ No unexpected navigation attempts');
      }

      // Get final console state
      const finalStatus = await page.locator('#status-text').textContent();
      console.log(`   Final status: ${finalStatus}`);

      return {
        navigationAttempts: navAttempts,
        finalStatus
      };
    }

    // RUN 1: Fresh load
    console.log('=' .repeat(60));
    console.log('STARTING RUN 1: Fresh page load (like incognito)');
    console.log('=' .repeat(60));

    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const run1Results = await performFullFlow(1);

    // MANUAL RELOAD: Simulate what happens in regular browser
    console.log('\n' + '='.repeat(60));
    console.log('RELOADING PAGE (simulating cached state)');
    console.log('='.repeat(60) + '\n');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // RUN 2: After reload with cached state
    console.log('=' .repeat(60));
    console.log('STARTING RUN 2: After manual reload (like regular browser)');
    console.log('=' .repeat(60));

    const run2Results = await performFullFlow(2);

    // COMPARISON
    console.log('\n' + '='.repeat(60));
    console.log('COMPARISON RESULTS');
    console.log('='.repeat(60));

    console.log('\nRUN 1 (Fresh):');
    console.log(`  Navigation attempts: ${run1Results.navigationAttempts.length}`);
    console.log(`  Final status: ${run1Results.finalStatus}`);

    console.log('\nRUN 2 (After reload):');
    console.log(`  Navigation attempts: ${run2Results.navigationAttempts.length}`);
    console.log(`  Final status: ${run2Results.finalStatus}`);

    if (run1Results.navigationAttempts.length !== run2Results.navigationAttempts.length) {
      console.log('\n⚠️  BEHAVIOR DIFFERS BETWEEN RUNS!');
      console.log('This confirms the cached state issue.');
    } else {
      console.log('\n✓ Behavior is consistent between runs');
    }

    // For debugging, keep browser open if there's a difference
    if (run2Results.navigationAttempts.length > 0) {
      console.log('\n⚠️  Unexpected navigation in Run 2, pausing for inspection...');
      await page.waitForTimeout(5000);
    }
  });
});
